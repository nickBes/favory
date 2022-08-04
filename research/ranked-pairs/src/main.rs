use std::{collections::HashMap, vec};
use itertools::Itertools;

type LaptopId = u64;
type Vote = Vec<LaptopId>;
// the first item is the winner, second item is the loser
struct Pair(LaptopId, LaptopId);

// hashed representation of a pair, so order of the pair items
// wouldn't matter in the pairs hashmap
#[derive(PartialEq, Eq, Hash)]
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

impl From<&Pair> for PairHash {
    fn from(pair: &Pair) -> Self { PairHash::new(pair.0, pair.1) }
}

impl From<&Majority> for PairHash {
    fn from(majority: &Majority) -> Self { PairHash::new(majority.loser, majority.winner) }
}

impl From<Majority> for PairHash {
    fn from(majority: Majority) -> Self { PairHash::new(majority.loser, majority.winner) }
}

type MajorityScore = u64;
#[derive(Eq, PartialEq, Debug)]
struct Majority {
    winner: LaptopId,
    loser: LaptopId,
    score: MajorityScore
}

impl From<&Pair> for Majority {
    fn from(pair: &Pair) -> Self { Majority { winner: pair.0, loser: pair.1, score: 1 } }
}

struct RankedPairsEngine {
    sorted_majorities: Vec<Majority>,
    majority_indexes: HashMap<PairHash, usize>
}

impl RankedPairsEngine {
    pub fn new() -> Self {
        Self {
            // map: HashMap::new(),
            sorted_majorities: Vec::new(),
            majority_indexes: HashMap::new()
        }
    }
    // adds pairs from each combinations that describes
    // a preference of the previous item over the later
    pub fn vote(&mut self, vote: &Vote) {
        for (winner, losser) in vote.iter().tuple_combinations() {
            self.add_pair(&Pair(*winner, *losser))
        }
    }

    pub fn print_majorities(&self) {
        println!("{:?}", self.sorted_majorities);
    }

    fn increase_majority_score(&mut self, index: usize) {
        self.sorted_majorities[index].score += 1;
        let current_majority = &self.sorted_majorities[index];

        // look for the farthest closest that its score is smaller by one
        // and then swap
        let swap_index = self.sorted_majorities[0..index]
                                        .iter()
                                        .rposition(|m2| m2.score < current_majority.score);

        if let Some(i) = swap_index {
            // adding one because the index we found is for the bigger majority
            let to_swap_majority = &self.sorted_majorities[i];

            // update the majority indexes map
            self.majority_indexes.insert(to_swap_majority.into(), index);
            self.majority_indexes.insert(current_majority.into(), i);

            self.sorted_majorities.swap(i, index);
        }
    }

    fn decrease_majority_score(&mut self, index: usize) {
        self.sorted_majorities[index].score -= 1;
        let current_majority = &self.sorted_majorities[index];

        if current_majority.score == 0 {
            // then the majority score is below the minimum
            self.majority_indexes.remove(&self.sorted_majorities
                                                                .swap_remove(index)
                                                                .into());
            
        } else {
            // look for the closest majority which score is the same
            // and then swap
            let swap_index = self.sorted_majorities[index + 1..self.sorted_majorities.len()]
                                        .iter()
                                        .position(|m2| m2.score == current_majority.score);
            
            if let Some(i) = swap_index {
                let to_swap_majority = &self.sorted_majorities[i];

                // update the majority indexes map
                // update the majority indexes map
                self.majority_indexes.insert(to_swap_majority.into(), index);
                self.majority_indexes.insert(current_majority.into(), i);

                self.sorted_majorities.swap(i, index);
            }
        }
    }

    fn add_pair(&mut self, pair: &Pair) {
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
            }
        }
    }
}

fn main() {
    let mut engine = RankedPairsEngine::new();
    let votings: Vec<Vote> = vec![
        vec![0, 1],
        vec![0, 1],
        vec![4, 1],
        vec![4, 1],
        vec![1, 2]
    ];
    for vote in votings {
        engine.vote(&vote);
    }
    engine.print_majorities();

    engine.vote(&vec![1,0]);

    engine.print_majorities();
    println!("Hello, world!");
}