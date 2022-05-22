use std::collections::HashMap;
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

impl From<Pair> for PairHash {
    fn from(pair: Pair) -> Self { PairHash::new(pair.0, pair.1) }
}

struct HighIdScore(i64);
impl HighIdScore {
    fn new() -> Self {
        Self(0)
    }
    fn high_won(&mut self) {
        self.0 += 1;
    }
    fn low_won(&mut self) {
        self.0 -= 1;
    }
}

struct RankedPairsEngine {
    map: HashMap<PairHash, HighIdScore>,
}
impl RankedPairsEngine {
    pub fn new() -> Self {
        Self {
            map: HashMap::new()
        }
    }
    // adds pairs from each combinations that describes
    // a preference of the previous item over the later
    pub fn vote(&mut self, vote: &Vote) {
        for (winner, losser) in vote.iter().tuple_combinations() {
            self.add_pair(Pair(*winner, *losser))
        }
    }
    fn add_pair(&mut self, pair: Pair) {
        // if the winner id is the lower one
        if pair.0 < pair.1 {
            self.map
                .entry(PairHash { _low: pair.0, _high: pair.1 })
                .or_insert_with(HighIdScore::new)
                .low_won();
        } else {
            // the winner id is the higher one
            self.map
                .entry(PairHash { _low: pair.1, _high: pair.0 })
                .or_insert_with(HighIdScore::new)
                .high_won();
        }
    }
}

fn main() {
    let laptops = vec!['a', 'b', 'c', 'd'];
    let mut engine = RankedPairsEngine::new();
    let votings: Vec<Vote> = vec![
        vec![0, 1, 2, 3],
        vec![0, 3, 4, 1],
        vec![0, 1],
        vec![4, 1]
    ];
    for vote in votings {
        engine.vote(&vote);
    }
    println!("Hello, world!");
}