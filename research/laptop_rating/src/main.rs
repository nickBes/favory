use std::collections::HashMap;
use std::vec::Vec;
use petgraph::graph::Graph;
use petgraph::dot::Dot;
use petgraph::{Directed, Outgoing, Incoming};
use petgraph::prelude::NodeIndex;
use petgraph::visit::EdgeRef;
use std::cmp::Ordering;

type Pair = (usize, usize);
type TestGraph = Graph<char, isize, Directed, usize>;
type ScoreMap = HashMap<NodeIndex<usize>, isize>;

#[derive(Copy, Clone)]
struct WeightedPair {
    follower : usize,
    followed : usize,
    weight : isize
}

fn reverse (pair : &Pair) -> Pair {
    let (a, b) = *pair;
    (b, a)
}

fn calc_node_score (graph: &TestGraph, scores: &mut ScoreMap, index: &NodeIndex<usize>)  -> isize{
    let mut sum : isize = 1;
    for edge in graph.edges_directed(*index, Incoming) {
        let parent_index = edge.source();

        match scores.get(&parent_index) {
            Some(score) => sum += *score * edge.weight(),
            _ => {
                sum += calc_node_score(graph, scores, &parent_index) * edge.weight();
            }
        }
    }
    scores.insert(*index, sum);
    sum
}

fn calc_scores (graph: &TestGraph, scores: &mut ScoreMap, source_index : &NodeIndex<usize>) {
    for edge in graph.edges_directed(*source_index, Outgoing) {
        calc_node_score(graph, scores, &edge.target());
        calc_scores(graph, scores, &edge.target());
    }
}

fn is_cycle (pair : &WeightedPair, pairs : &Vec<WeightedPair>) -> bool {
    // get possible cases for cycles and check them
    if let Some(_) = pairs
                        .into_iter()
                        .filter(|val| val.follower == pair.followed)
                        .find_map(|val| {
                            // check if the current pair creates a cycle
                            let cycle = val.followed == pair.follower;
                            if cycle {
                                return Some(val)
                            }
                            // create a pair to go down the graph
                            // until we've through all of the nodes
                            // or until an edge before the "following" node
                            let new_pair = WeightedPair {
                                follower: pair.follower,
                                followed: val.followed,
                                weight: 0
                            };

                            if is_cycle(&new_pair, &pairs) {
                                return Some(val);
                            }
                            None
                        }){return true}
    false
}

fn add_pair (pair : &Pair, pairs : &mut HashMap<Pair, isize>) {
    match pairs.get_mut(pair) {
        Some(amount) => *amount += 1,
        _ => {
            match pairs.get_mut(&reverse(pair)) {
                // will lower the amount if the opposite
                // pair exists
                Some(amount2) => *amount2 -= 1,
                _ => {
                    // if non variation exists
                    // add the original pair
                    pairs.insert(*pair, 1);
                }
            }
        }
    }
}

fn main() {
    let items = vec!['a', 'b', 'c', 'd'];
    let ballots = vec![
        vec![0, 2, 3],
        vec![1, 3],
        vec![2,1]
    ];
    let mut pairs : HashMap<Pair, isize> = HashMap::new();
    for ballot in &ballots {
        // create an iteration for
        // creating pairs
        let mut i = 1;
        let len = ballot.len();
        while i < len {
            for j in 0..(len - i) {
                let pair = (ballot[j], ballot[j+i]);
                add_pair(&pair, &mut pairs);
            }
            i += 1;
        }
    }

    // organize the data in a vector of structs
    // for a more readable code
    let mut organized_pairs : Vec<WeightedPair> = pairs
                                                    .iter()
                                                    .filter_map(|(key, val)| {
                                                        match 0.cmp(val) {
                                                            Ordering::Less => return Some(WeightedPair {
                                                                follower: key.0,
                                                                followed: key.1,
                                                                weight: *val
                                                            }),
                                                            Ordering::Greater => return Some(WeightedPair {
                                                                follower: key.1,
                                                                followed: key.0,
                                                                weight: -*val
                                                            }),
                                                            _ => return None
                                                        }
                                                    })
                                                    .collect();           
    // sort by weight, desc
    // unwraping the option over the Ordering enum
    // because a and b will always be valid
    organized_pairs.sort_unstable_by(|a, b| b.weight.partial_cmp(&a.weight).unwrap());
    // we store pairs that don't cycle
    let mut filtered_pairs : Vec<WeightedPair> = Vec::new();
    for pair in &organized_pairs {
        if !is_cycle(pair, &filtered_pairs){
            filtered_pairs.push(pair.clone());
        }
    }

    // create a graph to format it into a dot format
    let mut graph : TestGraph = Graph::from_edges(filtered_pairs
                                                            .iter()
                                                            .map(|val| (val.follower, val.followed, val.weight)));

    let mut source_indexes  = Vec::new();
    for index in graph.node_indices() {
        // sets the labels for the graph
        if let Some(weight) = graph.node_weight_mut(index) {
            *weight = items[index.index()];
        }

        // finds the source of the graph, if nobody is
        // following the node in the current index
        if graph.neighbors_directed(index, Incoming).count() == 0 {
            source_indexes.push(index);
        }
    }

    let mut scores : ScoreMap = HashMap::new();
    for index in source_indexes {
        scores.insert(index, 0);
        calc_scores(&graph, &mut scores, &index);
    }
    for (key, value) in scores.iter() {
        println!("Node {}: {}", graph.node_weight(*key).unwrap(), value);
    }
    // prints the graph in the dot format
    // which can be copied into http://viz-js.com/
    println!("{}", Dot::new(&graph));
}