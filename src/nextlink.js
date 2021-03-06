//NextLink object we will be scoring
//isReadableText = human readable content- not url

PageZipper.prototype.NextLink = class {

	constructor(pgzp, text, link, alreadyLoaded, isHumanReadableText) {
		this.pgzp = pgzp;
		this.text = text;
		this.link = link;
		this.syn = '';
		this.isHumanReadableText = (isHumanReadableText === undefined) ? true : isHumanReadableText;
		this.isVisibleText = false;  //is this.text visible on the page?
		this.alreadyLoaded = alreadyLoaded;
		this.url = link.href;
		this.finalScore = null;
		this.trialScores = {};
	}

	addScore(trialName, score, isNormalized) {
		var normalizedKey = isNormalized ? 'normalizedScore' : 'unnormalizedScore';
		if (!this.trialScores[trialName]) this.trialScores[trialName] = {};
		this.trialScores[trialName][normalizedKey] = score;
	}

	getScore(trialName, isNormalized) {
		//for trials which do not get normalized, just return unnormalized score
		if (isNormalized && this.pgzp.trials[trialName].noNormailization) isNormalized = false;
		var normalizedKey = isNormalized ? 'normalizedScore' : 'unnormalizedScore';
		return this.trialScores[trialName][normalizedKey];
	}

	calculateTotalScore() {
		this.finalScore = 0;
		if (this.pgzp.debug) var debugStr = "Calculate Final Score: " + this.text + ": " + this.url;
		for (var trial in this.trialScores) {
			if (this.pgzp.trials.hasOwnProperty(trial)) {
				var nScore = this.getScore(trial, true);
				var weight = this.pgzp.trials[trial].weight;
				this.finalScore += nScore * weight;
				if (this.pgzp.debug) debugStr += "\n\t" + trial + "\t\t\t" + nScore + "\tx\t" + weight + "\t=\t" + (nScore * weight);
			}
		}
		this.pgzp.log(debugStr + "\nFinal Score:\t" + this.finalScore);
		return this.finalScore;
	}

	isSynNumber() {
		return this.pgzp.isPageBarNumber(this.syn);
	}

	toString() {
		return this.text;
	};

}
