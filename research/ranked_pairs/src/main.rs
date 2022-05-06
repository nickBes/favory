use std::collections::HashMap;

fn main() {
    rp(vec![
        vec![1, 2, 3, 4].into(),
        vec![1, 3, 4, 2].into(),
        vec![1, 4, 2, 3].into(),
        vec![1, 4, 3, 2].into(),
        //vec![1, 2, 4, 3].into(),
    ])
}

fn rp(votes: Vec<Vote>) {
    let mut pair_scores_map = UnorderedPairScoresMap::new();
    for vote in &votes {
        for i in 0..vote.laptops.len() {
            for j in i + 1..vote.laptops.len() {
                let pair = Pair {
                    winner: vote.laptops[i],
                    loser: vote.laptops[j],
                };
                pair_scores_map.update(&pair)
            }
        }
    }
    let sorted_majorities = {
        let mut majorities = pair_scores_map.majorities();
        majorities.sort_unstable_by(|majority1, majority2| {
            // note that we are calling `cmp` on majority2 instead of `majority1` so that it sorts
            // them in descending order.
            majority2.winner_score.cmp(&majority1.winner_score)
        });
        majorities
    };

    let mut graph = Graph::new();
    for majority in sorted_majorities {
        graph.add_connection(majority)
    }

    println!("{:#?}", graph)
}

// ============= graph ==========

#[derive(Debug)]
struct Graph {
    nodes: HashMap<LaptopId, Node>,
}
impl Graph {
    pub fn new() -> Self {
        Self {
            nodes: HashMap::new(),
        }
    }

    fn save_vis(&self, path: &str) {
        let mut graph = petgraph::Graph::<LaptopId, ()>::new();
        let mut node_indexes = HashMap::new();
        for laptop_id in self.nodes.keys() {
            let node_index = graph.add_node(*laptop_id);
            node_indexes.insert(*laptop_id, node_index);
        }
        for (laptop_id, node) in &self.nodes {
            let from_node_index = node_indexes[laptop_id];
            for child in &node.children {
                let to_node_index = node_indexes[&child];
                graph.add_edge(from_node_index, to_node_index, ());
            }
        }
        let dot = petgraph::dot::Dot::with_config(&graph, &[petgraph::dot::Config::EdgeNoLabel]);
        std::fs::write(path, format!("{:?}", dot)).unwrap();
    }

    // adds a connection representing the given majority as long as it does not create a cycle.
    pub fn add_connection(&mut self, majority: Majority) {
        self.save_vis("before");
        // check if this connection will create a cycle
        if let Some(winner_node) = self.nodes.get(&majority.winner) {
            if let Some(loser_node) = self.nodes.get(&majority.loser) {
                // if the loser node is above the winner node, puttin the loser node as a child of
                // the winner node, which is below it, will cause a cycle.
                if loser_node.value < winner_node.value {
                    // will cycle
                    return;
                }
            }
        }

        let winner_node = self
            .nodes
            .entry(majority.winner)
            .or_insert_with(Node::empty);
        winner_node.children.push(majority.loser);
        let winner_node_value = winner_node.value;

        let loser_node = self.nodes.entry(majority.loser).or_insert_with(Node::empty);

        if loser_node.value <= winner_node_value {
            let desired_loser_node_value = winner_node_value + 1;
            let increase_by = desired_loser_node_value - loser_node.value;
            self.save_vis("after");
            self.increase_score_recursively(majority.loser, increase_by);
        }
    }

    // increments the score of the node with the given laptop id and all of its ancestors by the given amount.
    pub fn increase_score_recursively(&mut self, node_laptop_id: LaptopId, increase_by: usize) {
        let node = self.nodes.get_mut(&node_laptop_id).unwrap();
        node.value += increase_by;
        let children = node.children.clone();
        for child in children {
            self.increase_score_recursively(child, increase_by)
        }
    }
}

#[derive(Debug)]
struct Node {
    children: Vec<LaptopId>,
    value: usize,
}
impl Node {
    pub fn empty() -> Self {
        Self {
            children: Vec::new(),
            value: 0,
        }
    }
}

// ============== majorities ============

#[derive(Debug, PartialEq, Eq, Hash, Clone, Copy, PartialOrd, Ord)]
#[repr(transparent)]
struct LaptopId(u64);

impl std::fmt::Display for LaptopId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

#[derive(Debug)]
#[repr(transparent)]
struct Vote {
    // laptop at index 0 is the best, laptop at index len-1 is the worst
    laptops: Vec<LaptopId>,
}
impl From<Vec<u64>> for Vote {
    fn from(laptops: Vec<u64>) -> Self {
        unsafe { std::mem::transmute(laptops) }
    }
}

#[derive(Debug)]
struct Pair {
    winner: LaptopId,
    loser: LaptopId,
}

#[derive(Debug, PartialEq, Eq, Hash, Clone, Copy)]
struct UnorderedPair {
    /// the lower laptop id
    _low: LaptopId,

    /// the higher laptop id
    _high: LaptopId,
}

#[derive(Debug)]
struct UnorderedPairScore {
    /// the amount of times the high laptop id won the low laptop id. this is incremented each time
    /// the high one wins, and decremented each time the high one loses.
    high_laptop_id_score: i64,
}
impl UnorderedPairScore {
    fn new() -> Self {
        Self {
            high_laptop_id_score: 0,
        }
    }
    fn high_won(&mut self) {
        self.high_laptop_id_score += 1;
    }
    fn low_won(&mut self) {
        self.high_laptop_id_score -= 1;
    }
}

impl UnorderedPair {
    pub fn new(a: LaptopId, b: LaptopId) -> Self {
        if a < b {
            Self { _low: a, _high: b }
        } else {
            Self { _low: b, _high: a }
        }
    }
}
impl From<(LaptopId, LaptopId)> for UnorderedPair {
    fn from(ids: (LaptopId, LaptopId)) -> Self {
        UnorderedPair::new(ids.0, ids.1)
    }
}
impl From<Pair> for UnorderedPair {
    fn from(pair: Pair) -> Self {
        UnorderedPair::new(pair.winner, pair.loser)
    }
}

#[derive(Debug)]
struct UnorderedPairScoresMap {
    map: HashMap<UnorderedPair, UnorderedPairScore>,
}
impl UnorderedPairScoresMap {
    pub fn new() -> Self {
        Self {
            map: HashMap::new(),
        }
    }
    pub fn update(&mut self, pair: &Pair) {
        // if the winner is the lower one
        if pair.winner < pair.loser {
            self.map
                .entry(UnorderedPair {
                    _low: pair.winner,
                    _high: pair.loser,
                })
                .or_insert_with(UnorderedPairScore::new)
                .low_won();
        } else {
            // the winner is the higher one
            self.map
                .entry(UnorderedPair {
                    _low: pair.loser,
                    _high: pair.winner,
                })
                .or_insert_with(UnorderedPairScore::new)
                .high_won();
        }
    }

    /// Returns a list of majorities from the unordered pairs.
    pub fn majorities(&self) -> Vec<Majority> {
        self.map
            .iter()
            .filter_map(|(unordered_pair, unordered_pair_score)| {
                // if the laptop with the higher id has won more times, it is the majority winner
                if unordered_pair_score.high_laptop_id_score == 0 {
                    None
                } else if unordered_pair_score.high_laptop_id_score > 0 {
                    Some(Majority {
                        winner: unordered_pair._high,
                        loser: unordered_pair._low,
                        winner_score: unordered_pair_score.high_laptop_id_score as u64,
                    })
                } else {
                    // the laptop with the lower id has won more times , it is the majority winner.
                    Some(Majority {
                        winner: unordered_pair._low,
                        loser: unordered_pair._high,
                        // we know that `high_laptop_id_score` is not greater than zero, and not
                        // zero so it must be < 0, so negating it will give an positive integer.
                        winner_score: (-unordered_pair_score.high_laptop_id_score) as u64,
                    })
                }
            })
            .collect()
    }
}

#[derive(Debug)]
struct Majority {
    winner: LaptopId,
    loser: LaptopId,
    winner_score: u64,
}
