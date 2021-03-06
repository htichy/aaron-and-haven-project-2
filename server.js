var mysql = require("mysql");
var express = require("express");
var bcrypt = require("bcryptjs");
var app = express();
var methodOverride = require('method-override')
var bodyParser = require('body-parser');
var session = require("express-session");
var cookieParser = require("cookie-parser");

app.use(cookieParser());
app.use(methodOverride('_method'))
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: "app", cookie: { maxAge: 1 * 1000 * 60 * 60 * 24 * 365 } }));
app.set('view engine', 'ejs');
// Initializes the connection variable to sync with conventions_db
var connection = mysql.createConnection({
	host: "localhost",
	port: 3306,
	user: "root",
	password: "password",
	database: "conventions_db"
});

admin_status = "false";

connection.connect(function () {
	console.log(connection.threadId)
})

app.get('/attendees', function (req, res) {
	connection.query('SELECT * FROM attendees', function (error, results, fields) {
		if (error) res.send(error)
		else res.json(results)
	});
});

app.get('/ejs', function (req, res) {
	connection.query('SELECT * FROM attendees', function (error, results, fields) {
		if (error) res.send(error)
		else res.render('pages/index', { attendees: results })
	})
});

app.post('/create_event',function(req,res){
	var query = connection.query('INSERT INTO event SET ?',[req.body],function(error,results){
		console.log('event added')
		console.log(req.body)
		console.log(query.sql)
		if (error) res.send(error)
		else res.redirect('/index.html')
	})
})

app.get('/events', function (req, res) {
	connection.query('SELECT id, title, descript, attendance, DATE_FORMAT(event_date, "%M %d, %Y") event_date FROM event', function (error, results, fields) {
		console.log("in add event route")
		if (error) res.send(error);
		else res.json(results)
	})
});



app.delete('/attendee-delete', function (req, res) {
	connection.query('DELETE FROM attendees WHERE id = (?)', [req.body.attendees_id], function (error, results, fields) {

		//   res.redirect('/');
		res.redirect('/')

	});
});

app.put('/swag-update/', function (req, res) {
	console.log(req.body)
	connection.query('UPDATE attendees SET picked_up_swag = ? WHERE id = ?', [(req.body.checked == 'true'), req.body.userid], function (error, results, fields) {

		//   res.redirect('/');
		res.json({ message: 'ok' })

	});
});

app.put('/lunch-update', function (req, res) {
	connection.query('UPDATE attendees SET picked_up_lunch = ? WHERE id= ?', [req.body.checked == "true", req.body.userid], function (error, results, fields) {
		res.json({ message: 'done' })
	})
});

app.get('/users', function (req, res) {
	connection.query('SELECT * FROM users', function (error, results, fields) {
		if (error) res.send(error)
		else res.json(results)
	})
})

app.get('/speakers', function (req, res) {
	connection.query('SELECT * FROM speakers', function (error, results, fields) {
		if (error) res.send(error)
		else res.json(results)
	})
});

app.delete('/speaker-delete', function (req, res) {
	connection.query('DELETE FROM speakers WHERE id = (?)', [req.body.speakers_id], function (error, results, fields) {
		if (error) {
			res.json({ error: error })
			return
		}

		res.json({ message: 'ok' })

	});
});





app.get('/schedule', function (req, res) {

	console.log("status");
	console.log(req.session.admin_status);
	res.render('pages/schedule', {admin_status: req.session.admin_status});

})

app.post('/speaker_sign_up', function (req, res) {
	console.log(req.body)

	var query = connection.query('INSERT INTO speakers SET ?',
		[req.body],
		function (error, results, fields) {
			console.log(query.sql)
			if (error) {
				res.send("Please fill out the entire forum")
				console.log(error)
			}

			else res.render('pages/schedule')

		})
});


app.get('/attendance', function (req, res) {
	connection.query('SELECT * FROM attendance ORDER BY speaker_id ASC;', function (error, results, fields) {
		if (error) res.send(error)
		else res.json(results)
	})
});


app.post('/add_event', function (req, res) {
	connection.query('INSERT INTO attendees SET ?', [req.body], function (error, results, fields) {
		console.log("in add event route")
		if (error) res.send("Please fill out the entire forum")
		else res.render('pages/schedule')
	})
});

app.post('/check_in', function (req, res) {
	var query= connection.query('INSERT INTO attendance SET ?', [req.body], function (error, results, fields) {
		console.log(query.sql)
		if (error) {res.send("ID does not exist")
			console.log(error)
		} else {
			res.redirect('attendance.html')
		}
	})
});



app.post("/signup", function (req, res) {

	bcrypt.genSalt(10, function (err, salt) {


	bcrypt.genSalt(10, function(err, salt) {
		
		bcrypt.hash(req.body.user_password, salt, function(err, p_hash) {
			if (req.body.user_admin == "true") {
				admin_status = true;
			} else {
				admin_status = false;
			}
			var query = connection.query("INSERT INTO users (email, password_hash, admin) VALUES (?, ?, ?)", [req.body.user_email, p_hash, req.body.user_admin], function (error, results, fields) {
				// console.log(query.sql)
				if (error) throw error;
				req.session.email = req.body.user_email;
				req.session.admin_status = req.body.user_admin;
				console.log(req.session.admin_status);
				res.render("pages/add_event");
			});
		});
	});
});

app.get("/signin", function (req, res) {
	// res.send('hi')
	connection.query('SELECT * FROM users WHERE email = ?', [req.query.user_email], function (error, results, fields) {
		// res.json(results);

	  if (error) throw error;

	  
	  if (results.length == 0){
	  	res.send('try again');
	  }else {
	  	bcrypt.compare(req.body.user_password, results[0].password_hash, function(err, result) {
	  	    
	  	    if (result == true){

						console.log(results[0].admin);
	  	      req.session.user_id = results[0].id;
						req.session.email = results[0].email;
						req.session.admin_status = results[0].admin;

	  	      res.send('you are logged in');

	  	    }else{
	  	      res.render('pages/add_event');
	  	    }
	  	});
	  }

	});
})

app.get("/logout", function (req, res) {
	req.session.destroy(function (err) {
		res.send("You are logged out");
	});
});


})
app.listen(3000, function () {
	console.log("listening on 3000");
})