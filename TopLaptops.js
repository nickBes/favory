// This class represents the top laptops returned from the selectLaptop
class TopLaptops{
	constructor(size) {
		// this.topLaptops is an array in which the laptop in the 0th index represents the 
		// best one of our top n laptops, and the nth index represents the worst one.
		this.topLaptops = [];
		for (let i = 0; i < size; i++){
			this.topLaptops.push({
				score: -1
			});
		}
	}
	// this function receives a laptop id, score and price, and adds it to the top laptops if it is better
	// than any of them. it starts from the best laptop and gradually goes down
	insertLaptopIfBetter(id, score, price) {
		console.log(`inserting laptop with id: ${id}, and score: ${score}`)
		for (let i = 0; i < this.topLaptops.length; i++){
			let curLaptop = this.topLaptops[i];
			// if the new laptops score is better, or its score is the same but its price is lower
			// replace the i'th laptop with the new one
			if (score > curLaptop.score || (score == curLaptop && price > curLaptop.price)) {
				this.topLaptops[i] = {
					score, id, price
				}
				break;
			}
		}
	}
}

module.exports = {
	TopLaptops
}