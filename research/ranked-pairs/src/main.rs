use itertools::Itertools;
use serde::Serialize;
use std::{
    cmp,
    collections::{HashMap, HashSet},
    fs, vec,
};

type LaptopId = usize;
type Vote = Vec<LaptopId>;
// the first item is the winner, second item is the loser
#[derive(Clone, Copy, Debug)]
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
    fn from(pair: Pair) -> Self {
        PairHash::new(pair.0, pair.1)
    }
}

impl From<Majority> for PairHash {
    fn from(majority: Majority) -> Self {
        PairHash::new(majority.loser, majority.winner)
    }
}

type MajorityScore = u64;
#[derive(Eq, PartialEq, Debug, Clone, Copy)]
struct Majority {
    winner: LaptopId,
    loser: LaptopId,
    score: MajorityScore,
    loser_index_in_dag: Option<usize>,
}

#[derive(Serialize)]
struct VizNode {
    id: LaptopId,
}

#[derive(Serialize)]
struct VizLink {
    source: LaptopId,
    target: LaptopId,
    weight: MajorityScore,
}

#[derive(Serialize)]
struct VizData {
    nodes: Vec<VizNode>,
    links: Vec<VizLink>,
}

#[derive(Debug, Copy, Clone)]
struct Lose {
    loser: LaptopId,
    weight: MajorityScore,
}

struct RankedPairsEngine {
    sorted_majorities: Vec<Majority>,
    majority_indexes: HashMap<PairHash, usize>,
    // laptop directed acyclic graph
    laptop_dag: HashMap<LaptopId, Vec<Lose>>,
    scores: HashMap<LaptopId, MajorityScore>,
}

impl RankedPairsEngine {
    pub fn new() -> Self {
        Self {
            sorted_majorities: Vec::new(),
            majority_indexes: HashMap::new(),
            laptop_dag: HashMap::new(),
            scores: HashMap::new(),
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
        let mut viz_data = VizData {
            nodes: Vec::new(),
            links: Vec::new(),
        };
        let mut non_repetetive_ids: HashSet<LaptopId> = HashSet::new();
        // save edges
        for (laptop_id, loses) in &self.laptop_dag {
            for lose in loses {
                viz_data.links.push(VizLink {
                    source: *laptop_id,
                    target: lose.loser,
                    weight: lose.weight,
                });
                non_repetetive_ids.insert(*laptop_id);
                non_repetetive_ids.insert(lose.loser);
            }
        }
        // save nodes
        for &id in &non_repetetive_ids {
            viz_data.nodes.push(VizNode { id });
        }

        // saves the viz data into json file
        let file = fs::File::create("./viz/public/data.json").unwrap();
        serde_json::to_writer_pretty(file, &viz_data).unwrap();
    }

    fn increase_weight_in_dag(&mut self, majority: Majority) {
        if let Some(index) = majority.loser_index_in_dag {
            // we're unwraping because the every majority that has a loser index
            // should exists in the laptop dag
            let loses = self.laptop_dag.get_mut(&majority.winner).unwrap();
            loses[index].weight += 1;
        }
    }

    fn decrease_weight_in_dag(&mut self, majority: Majority) {
        if let Some(index) = majority.loser_index_in_dag {
            // we're unwraping because the every majority that has a loser index
            // should exists in the laptop dag
            let loses = self.laptop_dag.get_mut(&majority.winner).unwrap();
            loses[index].weight -= 1;
        }
    }

    fn remove_from_dag(&mut self, majority: Majority) {
        if let Some(index) = majority.loser_index_in_dag {
            // after adding a majority to the sorted majority vec we're also adding
            // an edge to the dag. Hence, we can unwrap.
            let loses = self.laptop_dag.get_mut(&majority.winner).unwrap();

            // swap remove puts the last item in the place of the deleted item
            // hence we need to update the according majority
            if let Some(&last_lose) = loses.last() {
                // unwraping since if the edge exists in the graph, it most surely exists in the sorted majority vec
                let last_lose_majority_index = self
                    .majority_indexes
                    .get(&PairHash::new(majority.winner, last_lose.loser))
                    .unwrap();

                self.sorted_majorities[*last_lose_majority_index].loser_index_in_dag = Some(index);
                loses.swap_remove(index);

                // if the loser doesn't lose anymore remove it so it won't be counted in cycle checks
                let loser_loses_at_all = self
                    .sorted_majorities
                    .iter()
                    .any(|m2| return m2.loser == majority.loser && m2.loser_index_in_dag.is_some());

                if !loser_loses_at_all {
                    self.laptop_dag.remove(&majority.loser);
                }
            } else {
                // if the last lose is none it means that the array is empty and
                // we can remove the winner from the dag if nobody follows it
                let winner_loses_once = self.sorted_majorities.iter().any(|m2| {
                    return m2.loser == majority.winner && m2.loser_index_in_dag.is_some();
                });
                if !winner_loses_once {
                    self.laptop_dag.remove(&majority.winner);
                }
            }
        }
    }

    // adding a majority as an edge in the laptop dag, while returning the index of the loser
    // in the loses vec, so updating weights will be in constant time
    fn add_to_dag(&mut self, winner: LaptopId, loser: LaptopId, weight: MajorityScore) -> usize {
        // during our cycle check between a loser and a winner, we need to know
        // whether the loser exists to continue, so we have to create a node in the graph for the loser
        // even if it doesn't follow anything
        if let None = self.laptop_dag.get(&loser) {
            self.laptop_dag.insert(loser, vec![]);
        }

        match self.laptop_dag.get_mut(&winner) {
            Some(loses) => {
                loses.push(Lose { loser, weight });
                return loses.len() - 1;
            }
            _ => {
                self.laptop_dag.insert(winner, vec![Lose { loser, weight }]);
                return 0;
            }
        }
    }

    fn will_cycle_unchecked(&self, winner: LaptopId, loser: LaptopId) -> bool {
        if winner == loser {
            return true;
        }
        self.laptop_dag
            .get(&loser)
            .unwrap()
            .iter()
            .any(|lose| self.will_cycle_unchecked(winner, lose.loser))
    }

    fn will_cycle(&self, winner: LaptopId, loser: LaptopId) -> bool {
        // a cycle exists if there's a directed path from the loser node
        // to the winner node
        match self.laptop_dag.get(&loser) {
            Some(loses) => {
                if let Some(_) = self.laptop_dag.get(&winner) {
                    // loser and winner nodes exist, find a directed path between them
                    return loses.iter().any(|lose| {
                        // the current nodes exist in the graph as we already checked that
                        // hence we can use a different method without checks
                        self.will_cycle_unchecked(winner, lose.loser)
                    });
                }
                // winner node doesn't exist hence there won't be a cycle
                false
            }
            _ => {
                // loser node doesn't exist hence there won't be a cycle
                false
            }
        }
    }

    fn swap_majorities(&mut self, m1: usize, m2: usize, with_cycle_check: bool) {
        // by checking that the indexes are different we're making sure
        // we are not doing expensive operations just to keep a majority
        // in the same place
        if m1 != m2 {
            // update majority index map
            self.majority_indexes
                .insert(self.sorted_majorities[m1].into(), m2);
            self.majority_indexes
                .insert(self.sorted_majorities[m2].into(), m1);

            // swap
            self.sorted_majorities.swap(m1, m2);

            if with_cycle_check {
                let minimal_index = cmp::min(m1, m2);
                // remove all edges so we can add them again after checking for cycles

                let mut to_check_majorities: Vec<Majority> =
                    Vec::with_capacity(self.sorted_majorities.len());

                to_check_majorities.copy_from_slice(&self.sorted_majorities[minimal_index..]);

                for majority in &to_check_majorities {
                    self.remove_from_dag(*majority);
                }

                for majority in &to_check_majorities {
                    if !self.will_cycle(majority.winner, majority.loser) {
                        self.add_to_dag(majority.winner, majority.loser, majority.score);
                    }
                }
            }
        }
    }

    fn increase_majority_score(&mut self, index: usize) {
        self.sorted_majorities[index].score += 1;
        if index == 0 {
            // the first majority will always stay at top when increasing,
            // which means it doesn't change any state and we can ignore expensive
            // operation
            self.increase_weight_in_dag(self.sorted_majorities[0]);
            return;
        }
        let current_majority_score = self.sorted_majorities[index].score;

        // look for the closest majority that its score is bigger or the same
        // and then swap with the previous
        let to_swap_index = self.sorted_majorities[0..index]
            .iter()
            .rposition(|m2| m2.score >= current_majority_score)
            // adding one because the index we found is for the bigger majority,
            // and we need to swap for the one before. 0 is default because if an index
            // wasn't found it's the majority with the maximal score
            .map_or(0, |i| i + 1);

        if self.sorted_majorities[index].loser_index_in_dag.is_none() {
            // if a majority that failed a cycle check goes up, it might go above
            // a majority that passsed a cycle check that caused it to fail,
            // hence we need to find if its possible, and if it's we'll cycle check
            let going_over_passing_majority = self.sorted_majorities[to_swap_index..index]
                .iter()
                .any(|majority| majority.loser_index_in_dag.is_some());

            self.swap_majorities(index, to_swap_index, going_over_passing_majority);
            if !going_over_passing_majority {
                self.increase_weight_in_dag(self.sorted_majorities[to_swap_index]);
            }
        } else {
            // a majority that passed cycle check wouldn't require a cycle check again
            // when going up, as it's still will be above the majorities that might've
            // failed cause of this majority
            self.swap_majorities(index, to_swap_index, false);
            self.increase_weight_in_dag(self.sorted_majorities[to_swap_index]);
        }
    }

    fn decrease_majority_score(&mut self, index: usize) {
        self.sorted_majorities[index].score -= 1;
        let current_majority_score = self.sorted_majorities[index].score;
        let sm_length = self.sorted_majorities.len();

        if current_majority_score == 0 {
            // then the majority score is below the minimum
            // and we can delete it
            self.remove_from_dag(self.sorted_majorities[index]);
            self.majority_indexes
                .remove(&self.sorted_majorities.swap_remove(index).into());
        } else if index == sm_length - 1 {
            // the last majority can't go down even more. hence, it wouldn't change
            // any state and we can ignore expensive operations
            self.decrease_weight_in_dag(self.sorted_majorities[index]);
        } else {
            // look for the closest majority which score is the same
            // and then swap
            let to_swap_index = self.sorted_majorities[index + 1..sm_length]
                .iter()
                .position(|m2| m2.score <= current_majority_score)
                // adding up index + 1 because the offset of indexes isn't included when iterating
                // over the slice. the default is the last index because. if it didn't find an index
                // then it's the minimal score
                .map_or(sm_length - 1, |i| i + index + 1);

            if self.sorted_majorities[index].loser_index_in_dag.is_none() {
                // when a majority that didn't pass a cycle check goes down
                // it wouldn't pass a cycle check again as the previous majorities
                // that caused it to fail the cycle check don't chenge. moreover,
                // the majorities below aren't affected by a majority that didn't pass a
                // cycle check. hence, we don't need to do a cycle check at all
                self.swap_majorities(to_swap_index, index, false);
                self.decrease_weight_in_dag(self.sorted_majorities[to_swap_index]);
            } else {
                // when a majority that passed a cycle check goes down
                // it might've went bellow a majority that failed a cycle check
                // because of the current. hence, we gonna check it and if so we gonna
                // check for cycles again
                let majority_went_bellow_failed = self.sorted_majorities[index + 1..to_swap_index]
                    .iter()
                    .any(|majority| majority.loser_index_in_dag.is_none());

                self.swap_majorities(index, to_swap_index, majority_went_bellow_failed);
                if !majority_went_bellow_failed {
                    self.decrease_weight_in_dag(self.sorted_majorities[to_swap_index]);
                }
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
            }
            _ => {
                // adding a new pair down to the sorted majorities, as it has the minimal value
                self.majority_indexes
                    .insert(hash, self.sorted_majorities.len());

                let cycles = self.will_cycle(pair.0, pair.1);

                if !cycles {
                    let loser_index = self.add_to_dag(pair.0, pair.1, 1);
                    self.sorted_majorities.push(Majority {
                        winner: pair.0,
                        loser: pair.1,
                        score: 1,
                        loser_index_in_dag: Some(loser_index),
                    });
                } else {
                    self.sorted_majorities.push(Majority {
                        winner: pair.0,
                        loser: pair.1,
                        score: 1,
                        loser_index_in_dag: None,
                    });
                }
            }
        }
    }
}

fn main() {
    let mut engine = RankedPairsEngine::new();
    let votings: Vec<Vote> = vec![vec![0, 1, 2], vec![2, 1, 3], vec![1, 2, 3, 4]];
    for vote in votings {
        engine.vote(&vote);
    }

    engine.save_json();
    engine.print_majorities();
}
