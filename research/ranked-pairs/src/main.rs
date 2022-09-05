use std::{collections::{HashMap, HashSet}, vec, cmp, fs};
use itertools::Itertools;
use serde::Serialize;

type LaptopId = usize;
type Vote = Vec<LaptopId>;
type LaptopScore = usize;
// the first item is the winner, second item is the loser
#[derive(Clone, Copy)]
struct Pair(LaptopId, LaptopId);

// hashed representation of a pair, so order of the pair items
// wouldn't matter in the pairs hashmap
#[derive(PartialEq, Eq, Hash, Clone, Copy)]
struct PairHash {
    /// the lower laptop id
    _low: LaptopId,

    /// the higher laptop id
    _high: LaptopId,
}

impl PairHash {
    pub fn new(a: LaptopId, b: LaptopId) -> Self {
        if a < b {
            Self { _low: a, _high: b }
        } else {
            Self { _low: b, _high: a }
        }
    }
}

impl From<Pair> for PairHash {
    fn from(pair: Pair) -> Self { PairHash::new(pair.0, pair.1) }
}

impl From<Majority> for PairHash {
    fn from(majority: Majority) -> Self { PairHash::new(majority.loser, majority.winner) }
}

type MajorityScore = u64;
#[derive(Eq, PartialEq, Debug, Clone, Copy)]
struct Majority {
    winner: LaptopId,
    loser: LaptopId,
    score: MajorityScore
}

impl From<Pair> for Majority {
    fn from(pair: Pair) -> Self { Majority { winner: pair.0, loser: pair.1, score: 1 } }
}

#[derive(Serialize)]
struct VizNode {
    id: LaptopId
}

#[derive(Serialize)]
struct VizLink {
    source: LaptopId,
    target: LaptopId,
    weight: LaptopScore
}

#[derive(Serialize)]
struct viz_data {
    nodes: Vec<VizNode>,
    links: Vec<VizLink>
}

struct Lose {
    loser: LaptopId,
    weight: LaptopScore
}

struct RankedPairsEngine {
    sorted_majorities: Vec<Majority>,
    majority_indexes: HashMap<PairHash, usize>,
    // laptop directed acyclic graph
    laptop_dag: HashMap<LaptopId, Vec<Lose>>,
    scores: HashMap<LaptopId, LaptopScore>
}

impl RankedPairsEngine {
    pub fn new() -> Self {
        Self {
            sorted_majorities: Vec::new(),
            majority_indexes: HashMap::new(),
            laptop_dag: HashMap::new(),
            scores: HashMap::new()
        }
    }

    // adds pairs from each combinations that describes
    // a preference of the previous item over the later
    pub fn vote(&mut self, vote: &Vote) {
        for (winner, losser) in vote.iter().tuple_combinations() {
            self.add_pair(Pair(*winner, *losser));
        }
    }

    pub fn print_majorities(&self) {
        println!("{:?}", self.sorted_majorities);
    }

    pub fn save_json(&self) {
        let mut viz_data = viz_data {nodes: Vec::new(), links: Vec::new()};
        let mut non_repetetive_ids: HashSet<LaptopId> = HashSet::new();
        // save edges
        for (laptop_id, loses) in &self.laptop_dag {
            for lose in loses {
                viz_data.links.push(VizLink {source: *laptop_id, target: lose.loser, weight: lose.weight});
                non_repetetive_ids.insert(*laptop_id);
                non_repetetive_ids.insert(lose.loser);
            }
        }
        // save nodes
        for &id in &non_repetetive_ids {
            viz_data.nodes.push(VizNode {id});
        }

        // saves the viz data into json file
        let file = fs::File::create("./viz/public/data.json").unwrap();
        serde_json::to_writer_pretty(file, &viz_data).unwrap();
    }

    fn add_to_dag(&mut self, winner: LaptopId, loser: LaptopId, weight: LaptopScore) {
        match self.laptop_dag.get_mut(&winner) {
            Some(loses) => {
                loses.push(Lose {loser, weight});
            },
            _ => {
                self.laptop_dag.insert(winner, vec![Lose {loser, weight}]);
            }
        }

        if let None = self.laptop_dag.get(&loser) {
            self.laptop_dag.insert(loser, vec![]);
        }
    }

    fn will_cycle_unchecked(&self, winner: LaptopId, loser: LaptopId) -> bool {
        if winner == loser {
            return true
        }
        self.laptop_dag.get(&loser)
                        .unwrap()
                        .iter()
                        .any(|lose| {
                            self.will_cycle_unchecked(winner, lose.loser)
                        }) 
    }

    fn will_cycle(&self, winner: LaptopId, loser: LaptopId) -> bool {
        // a cycle exists if there's a directed path from the loser node
        // to the winner node
        match self.laptop_dag.get(&loser) {
            Some(loses) => {
                if let Some(_) = self.laptop_dag.get(&winner) {
                    // loser and winner nodes exist, find a directed path between them
                    return loses.iter()
                                .any(|lose| {
                                    // the current nodes exist in the graph as we already checked that
                                    // hence we can use a different method without checks
                                    self.will_cycle_unchecked(winner, lose.loser)
                                })
                }
                // winner node doesn't exist hence there won't be a cycle
                println!("Winner {} doesn't exists.", winner);
                false
            },
            _ => {
                // loser node doesn't exist hence there won't be a cycle
                println!("Loser {} doesn't exists.", loser);
                false
            }
        }
    }

    fn swap_majorities(&mut self, m1: usize, m2: usize) {
        // by checking that the indexes are different we're making sure
        // we are not doing extensive operations just to keep a majority
        // in the same place
        if m1 != m2 {
            // update majority index map
            self.majority_indexes.insert(self.sorted_majorities[m1].into(), m2);
            self.majority_indexes.insert(self.sorted_majorities[m2].into(), m1);

            // swap
            self.sorted_majorities.swap(m1, m2);

            let minimal_index = cmp::min(m1, m2);
            // remove all edges so we can add them again after checking for cycles
            self.sorted_majorities[minimal_index..].iter()
                                                    .for_each(|majority| {
                                                        // after adding a majority to the sorted majority vec we're also adding 
                                                        // an edge to the dag. Hence, we can unwrap
                                                        let loses = self.laptop_dag.get_mut(&majority.winner).unwrap();
                                                        let to_remove_index = loses.iter()
                                                                                            .position(|lose| lose.loser == majority.loser)
                                                                                            .unwrap();
                                                        
                                                        loses.swap_remove(to_remove_index);
                                                    });
        }
    }

    fn increase_majority_score(&mut self, index: usize) {
        self.sorted_majorities[index].score += 1;
        let current_majority_score = self.sorted_majorities[index].score;
        // this method wouldn't be called if the vec was empty, hence we can unwrap
        let top_majority_score = self.sorted_majorities.first().unwrap().score;

        // checking if the new score is the maximal so we won't
        // have to loop through the array till the first majority
        if current_majority_score < top_majority_score {
            // then the new score is bigger than the maximal score after adding 1,
            // which means that maximal score equals to the previous score
            // and we can just switch places between the maximal and the current majority
            // without affecting the order

            // update the indexes of the majorities that will move
            self.swap_majorities(index, 0);
        } else {
            // look for the closest majority that its score is bigger or the same
            // and then swap with the previous
            let swap_index = self.sorted_majorities[0..index]
                                            .iter()
                                            .rposition(|m2| m2.score >= current_majority_score);
                                    
            if let Some(i) = swap_index {
                // adding one because the index we found is for the bigger majority,
                // and we need to swap for the one before
                let to_swap_index = i + 1;

                self.swap_majorities(index, to_swap_index);
            }
        }
    }


    fn decrease_majority_score(&mut self, index: usize) {
        self.sorted_majorities[index].score -= 1;
        let current_majority_score = self.sorted_majorities[index].score;
        // this method wouldn't be called if the vec was empty, hence we can unwrap
        let last_majority_score = self.sorted_majorities.last().unwrap().score;

        if current_majority_score == 0 {
            // then the majority score is below the minimum
            self.majority_indexes.remove(&self.sorted_majorities
                                                .swap_remove(index)
                                                .into());
            
        // checking if the new score is the minimal so we won't have to loop
        // from the current index to the last one
        } else if last_majority_score > current_majority_score {
            // the new score is smaller than the minimal after removing one,
            // which means that the previous score equals to the minimal,
            // and we can swap between them without affecting the order

            let to_swap_index = self.majority_indexes.len() - 1;
            self.swap_majorities(to_swap_index, index);

        } else {
            // look for the closest majority which score is the same
            // and then swap
            let swap_index = self.sorted_majorities[index + 1..self.sorted_majorities.len()]
                                                .iter()
                                                .position(|m2| m2.score <= current_majority_score);
            
            if let Some(i) = swap_index {
                // substracting one as we want to place the current majority above the smaller majority
                let to_swap_index = i - 1;
                self.swap_majorities(to_swap_index, index);
            }
        }
    }

    fn add_pair(&mut self, pair: Pair) {
        let hash: PairHash = pair.into();

        match self.majority_indexes.get(&hash) {
            Some(&index) => {
                let current_majority = &self.sorted_majorities[index];
                if current_majority.winner == pair.0 {
                    // then the vec had an existing majority
                    // and we can increase the score
                    self.increase_majority_score(index);
                } else {
                    // the vec had an opposite majority
                    self.decrease_majority_score(index);
                }
            },
            _ => { // adding a new pair down to the sorted majorities, as it has the minimal value
                self.majority_indexes.insert(hash, self.sorted_majorities.len());
                self.sorted_majorities.push(pair.into());

                if !self.will_cycle(pair.0, pair.1) {
                    self.add_to_dag(pair.0, pair.1, 1);
                }
            }
        }
    }
}

fn main() {
    let mut engine = RankedPairsEngine::new();
    let votings: Vec<Vote> = vec![
        vec![1, 2],
        vec![0, 1],
        vec![2, 0],
    ];
    for vote in votings {
        engine.vote(&vote);
    }

    engine.save_json();
}