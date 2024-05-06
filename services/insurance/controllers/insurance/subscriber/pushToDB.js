const stream = require('stream');

class PushToDB extends stream.Transform {
	constructor() {
		super({ objectMode: true })
	}

	async _transform(chunk, encoding, done) {
		try {
            console.log(chunk, 'chunk');
            return
			let csvRow = parseCsvRow(chunk.toString())
            console.log(csvRow, 'csvRow');
			// await this.sendBatchMsgToSqs(csvRow)
		} catch (error) {
			done(error)
		}
	}

	sendBatchMsgToSqs(csvRow) {
		let sqsReq = {
			MessageBody: csvRow,
			QueueUrl: '<your sqs queue endpoint>'
		}
		return new Promise((resolve, reject) => {
			this.sqs.sendMessage(sqsReq, function(err, data) {
				if (err) {
					reject()
				} else {
					//all msgs sent successfully
					resolve()
				}
			})
		})
	}
}

module.exports = new PushToDB();