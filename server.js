require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const { Schema } = mongoose
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Basic Configuration
const port = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)

app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
	res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
	res.json({ greeting: 'hello API' });
});

const userSchema = new Schema({
	username: String,
})
const User = mongoose.model('User', userSchema);
const exerciseSchema = new Schema({
	user: { type: Schema.Types.ObjectId, ref: 'User' },
	description: String,
	duration: Number,
	date: { type: Date, default: new Date() },
})
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.post('/api/users', async (req, res) => {
	if (req.body.username === null || req.body.username === undefined) {
		res.status(400).send('Path `username` is required.')
	} else {
		let insertedUser = await User.create({
			_id: new mongoose.Types.ObjectId(),
			username: req.body.username
		})
		res.json({
			username: insertedUser.username,
			_id: insertedUser._id,
		})
	}
})

app.get('/api/users', async (req, res) => {
	let usersFound = await User.find();
	await res.json(usersFound);
})

app.post('/api/users/:_id/exercises', async (req, res) => {
	let { description, duration, date } = req.body;
	let _id = req.params._id || req.body._id;
	date = await (date || new Date().toISOString().slice(0, 10));
	let user = await User.findById({ _id });
	let returnObj = await {
		_id: _id,
		username: user.username,
		description: description,
		duration: parseInt(duration),
		date: new Date(date).toDateString(),
	}
	await Exercise.create({
		user: _id,
		description: description,
		duration: parseInt(duration),
		date: new Date(date),
	})
	await res.json(returnObj);
})

app.get('/api/users/:_id/logs', async (req, res) => {
	let _id = req.params._id;
	let userFound = await User.findById({ _id });
	if (userFound === null) {
		res.status(400).send('Unknown userId');
	} else {
		let query = Exercise.find().where('user').equals(req.params._id);
		if (req.query.from) {
			query.where('date').gte(req.query.from);
		}
		if (req.query.to) {
			query.where('date').lte(req.query.to);
		}
		if (req.query.limit) {
			query.limit(parseInt(+req.query.limit))
		}
		query.exec((err, data) => {
			if (err) console.error(err);
			let log = data.map(item => ({
				description: item.description,
				duration: item.duration,
				date: item.date.toDateString(),
			}));
			res.json(
				{
					_id: userFound._id,
					username: userFound.username,
					count: data.length,
					log: log
				}
			);
		})
	}
})

app.listen(port, function () {
	console.log(`Listening on port ${port}`);
});
