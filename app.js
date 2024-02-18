let hex;
const express = require('express');
const sports = express();
const bodyParser = require('body-parser');
const csrf = require('tiny-csrf');
const passport = require('passport');
const connectEnsureLogin = require('connect-ensure-login');
const session = require('express-session');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const { Registers, AllEvents, User } = require('./models');
const cookieParser = require('cookie-parser');


sports.use('/images', express.static('images'));
sports.use(bodyParser.json());
sports.use(bodyParser.urlencoded({ extended: false }));
sports.use(cookieParser("shh! some secret string"));
sports.use(csrf("this_should_be_32_character_long",["POST","PUT","DELETE"]));
sports.use(session({
  secret: "my_super_secret_key_123456789",
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
sports.use(passport.initialize());
sports.use(passport.session());
sports.set('views', './views');
sports.set('view engine', 'ejs');
sports.use(express.static('public'));


passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, authenticateUser));

passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then(user => done(null, user))
    .catch(err => done(err, null));
});


sports.post("/loginSubmit", passport.authenticate('local', { failureRedirect: "/studentLogin" }), loginSubmitHandler);

sports.get("/login", (req, res) => renderLogin(req, res, { title: "Login", csrfToken: req.csrfToken() }));

sports.get("/signup", (req, res) => renderSignup(req, res, { title: "Signup", csrfToken: req.csrfToken() }));

sports.post("/signupSubmit", signupSubmitHandler);

sports.get('/adminDashboard', connectEnsureLogin.ensureLoggedIn(), isAuthenticated, adminDashboardHandler);

sports.get('/addEvent', connectEnsureLogin.ensureLoggedIn(), addEventHandler);

sports.post('/uploadEvent', connectEnsureLogin.ensureLoggedIn(), uploadEventHandler);

sports.get('/allEvents', connectEnsureLogin.ensureLoggedIn(), allEventsHandler);

sports.get("/deleteEvent", connectEnsureLogin.ensureLoggedIn(), deleteEventHandler);

sports.get('/dashBoard', connectEnsureLogin.ensureLoggedIn(), dashBoardHandler);

sports.get('/viewEvent', connectEnsureLogin.ensureLoggedIn(), viewEventHandler);

sports.get("/myEvents", connectEnsureLogin.ensureLoggedIn(), myEventsHandler);

sports.get("/viewRegisters", connectEnsureLogin.ensureLoggedIn(), viewRegistersHandler);

sports.get("/registerEvent", connectEnsureLogin.ensureLoggedIn(), registerEventHandler);

sports.get("/unRegister", connectEnsureLogin.ensureLoggedIn(), unRegisterHandler);


function authenticateUser(username, password, done) {
  console.log(username);
  User.findOne({
    where: { email: username }
  })
    .then(async (user) => {
      const result = await bcrypt.compare(password, user.password);
      if (result) {
        return done(null, user);
      } else {
        return done("Invalid Password");
      }
    })
    .catch((err) => done(err));
}

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/');
  }
}


function loginSubmitHandler(req, res) {
  console.log(req.user.email);
  if (req.user.email === "balu1234@gmail.com") {
    res.redirect("/adminDashboard");
  } else {
    res.redirect("/dashboard");
  }
}

function renderLogin(req, res, data) {
  res.render("login", data);
}

function renderSignup(req, res, data) {
  res.render("signup", data);
}

async function signupSubmitHandler(req, res) {
  const hashedPwd = await bcrypt.hash(req.body.password, saltRounds);
  try {
    const user = await User.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: hashedPwd,
    });
    req.login(user, (err) => {
      if (err) {
        console.log(err);
      }
      res.redirect("/login");
    });
  } catch (err) {
    console.log(err);
  }
}

function adminDashboardHandler(req, res) {
  console.log(req.user);
  res.render('adminDashboard', { name: req.user.firstName });
}

function addEventHandler(req, res) {
  res.render('addEvent', { title: 'Signup', csrfToken: req.csrfToken() });
}

async function uploadEventHandler(req, res) {
  try {
    await AllEvents.create({
      eventUserId: req.user.id,
      eventImg: req.body.EventImg,
      eventTitle: req.body.EventTitle,
      eventDesc: req.body.content,
      eventVenue: req.body.EventLocation,
      eventCapacity: req.body.EventMemebers,
      eventStartDate: req.body.EventStartDate,
      eventTime: req.body.EventTime,
      eventEndDate: req.body.EventEndDate,
    });
    res.redirect('/allEvents');
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
}

async function allEventsHandler(req, res) {
  try {
    const EventData = await AllEvents.findAll();
    const FormattedEventData = EventData.map(EventData => ({
      id: EventData.id,
      UserId: EventData.eventUserId,
      eventImg: EventData.eventImg,
      eventTitle: EventData.eventTitle,
      eventDesc: EventData.eventDesc,
      eventVenue: EventData.eventVenue,
      eventCapacity: EventData.eventCapacity,
      eventStartDate: EventData.eventStartDate,
      eventTime: EventData.eventTime,
      eventEndDate: EventData.eventEndDate,
      createdAt: EventData.createdAt,
      updatedAt: EventData.updatedAt,
    }));
    if (req.user.email === "balu1234@gmail.com") {
      res.render('allEvents', { title: 'AllEvents', name: req.user.firstName, FormattedEventData, csrfToken: req.csrfToken() });
    } else {
      console.log("hello");
      hex = 0;
      res.render('SallEvents', { title: 'AllEvents', name: req.user.firstName, FormattedEventData, csrfToken: req.csrfToken() });
    }
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function deleteEventHandler(req, res) {
  const eventId = req.query.eventId;
  console.log("ggdghfghfhfhF" + eventId);
  try {
    await AllEvents.destroy({
      where: {
        id: eventId
      }
    });
    res.redirect('/allEvents');
  }
  catch (err) {
    console.log(err);
  }
}

function dashBoardHandler(req, res) {
  res.render('dashBoard', { name: req.user.firstName });
}

async function viewEventHandler(req, res) {
  try {
    const eventId = req.query.eventId;
    console.log(eventId);
    const eventCont = await AllEvents.findOne({ where: { id: eventId } });
    let flag = 0;
    var enddate = new Date(eventCont.eventEndDate);
    if (enddate < new Date()) {
      flag = 1;
    }
    console.log(eventCont.eventEndDate + "      " + new Date() + "          " + flag);
    console.log(req.user.email);
    if (req.user.email === "balu1234@gmail.com") {
      res.render("viewEvent", { eventCont, eventId, flag, hex });
    } else {
      res.render("SviewEvent", { eventCont, eventId, flag, hex });
    }
  } catch (err) {
    console.log(err);
  }
}

async function myEventsHandler(req, res) {
  try {
    const currentUserId = req.user.id;
    const data = await Registers.findAll({
      attributes: ['id', 'userId', 'eventId'],
      where: { userId: currentUserId }
    });
    const eventIdArray = data.map(entry => entry.eventId);
    const formattedData = [];
    for (let i = 0; i < eventIdArray.length; i++) {
      const eventDetails = await AllEvents.findOne({
        where: { id: eventIdArray[i] }
      });
      formattedData.push(eventDetails);
    }
    hex = 1;
    res.render('myEvents', { formattedData, name: req.user.firstName });
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).send("Internal Server Error");
  }
}

async function viewRegistersHandler(req, res) {
  try {
    const eventId = req.query.eventId;
    const data = await Registers.findAll({ attributes: ['id', 'userId', 'eventId'] });
    const temp = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i].eventId == eventId) {
        temp.push(data[i]);
      }
    }
    const userIdArray = temp.map(entry => entry.userId);
    const formattedData = [];
    for (let i = 0; i < userIdArray.length; i++) {
      const userDetails = await User.findOne({
        where: { id: userIdArray[i] }
      });
      formattedData.push(userDetails);
    }
    res.render('viewRegisters', { formattedData, name: req.user.firstName });
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).send("Internal Server Error");
  }
}

async function registerEventHandler(req, res) {
  const ev = req.query.eventId;
  try {
    await Registers.create({ userId: req.user.id, eventId: ev });
    res.redirect("/myEvents");
  } catch (err) {
    console.log(err);
  }
}

async function unRegisterHandler(req, res) {
  const ev = req.query.eventId;
  try {
    await Registers.destroy({ where: { userId: req.user.id, eventId: ev } });
    res.redirect("/myEvents");
  } catch (err) {
    console.log(err);
  }
}

module.exports = sports;
