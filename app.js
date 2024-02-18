const express = require('express')
const sports = express()
const bodyParser = require('body-parser')
var csrf = require("tiny-csrf")
sports.use('/images', express.static('images'));
const passport=require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session =  require("express-session");
const LocalStrategy = require("passport-local")
const bcrypt=require("bcrypt")
const saltRounds = 10
const {Registers,AllEvents,  User } = require('./models')

var cookieParser = require("cookie-parser")
sports.use(bodyParser.json())
sports.set('views', './views');
const path=require("path");
const allevents = require('./models/allevents');
const { register } = require('module');
sports.use(express.urlencoded({extended:false}));
sports.use(cookieParser("shh! some secret string"))
sports.use(csrf("this_should_be_32_character_long",["POST","PUT","DELETE"]))

sports.set("view engine","ejs");
sports.use(express.static(path.join(__dirname,"public")));

sports.use(session({
  secret:"my_super_secret_key_123456789",
  cookie:{
    maxAge:24*60*60*1000 
  }
}))


sports.use(passport.initialize());
sports.use(passport.session());


const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next(); 
  } else {
    res.redirect('/'); 
  }
};



passport.use(new LocalStrategy({
  usernameField:'email',
  passwordField:'password'
},(username,password,done)=>{
  console.log(username);
  User.findOne({
    where:{
      email:username
    }
  }).then(async (user)=>{
    const result = await bcrypt.compare(password,user.password)
    if(result){
      return done(null,user);
    }
    else{
      return done("Invalid Password")
    }
  }).catch((err)=>{
    return (err)
  })
}))


passport.serializeUser((user,done)=>{
  console.log("Serilalizing user in session",user.id)
  done(null,user.id)
})

passport.deserializeUser((id,done)=>{
  User.findByPk(id)
  .then(user=>{
    done(null,user)
  }).catch(err=>{
    done(err,null)
  })
})






sports.post("/loginSubmit", passport.authenticate('local',{failureRedirect:"/studentLogin"}), (request, response) => {
  console.log(request.user.email)
  if(request.user.email==="balu1234@gmail.com"){
    response.redirect("/adminDashboard")
  }
  else{
    response.redirect("/dashboard");
  }
});


sports.get("/login",(request,response)=>{
    response.render("login",{title:"Login", csrfToken: request.csrfToken()})
})


sports.get("/signup",(request,response)=>{
    response.render("signup",{title:"Signup", csrfToken: request.csrfToken()})
})


sports.post("/signupSubmit", async (request, response) => {
  const hashedPwd = await  bcrypt.hash(request.body.password,saltRounds)
  try{
    const user=await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email:request.body.email,
      password:hashedPwd,
    })
    request.login(user,(err)=>{
       if(err){
          console.log(err);
       }
       response.redirect("/login")
    })
  }
  catch(err){
    console.log(err)
  }
})


sports.get('/adminDashboard',  connectEnsureLogin.ensureLoggedIn(),isAuthenticated, (request, response) => {
  console.log(request.user)
  response.render('adminDashboard', {name: request.user.firstName}); 
});


sports.get('/addEvent', connectEnsureLogin.ensureLoggedIn(), (request, response) => {
  response.render('addEvent', { title: 'Signup', csrfToken: request.csrfToken() });
});


sports.post('/uploadEvent', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
  

    await AllEvents.create({
      eventUserId: request.user.id, 
      eventImg: request.body.EventImg,
      eventTitle: request.body.EventTitle,
      eventDesc: request.body.content,
      eventVenue: request.body.EventLocation,
      eventCapacity: request.body.EventMemebers,
      eventStartDate: request.body.EventStartDate,
      eventTime: request.body.EventTime,
      eventEndDate: request.body.EventEndDate,
    });

    response.redirect('/allEvents');
  } catch (err) {
    console.log(err);
    
    response.status(500).send('Internal Server Error');
  }
});

sports.get('/allEvents', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  
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
    if(request.user.email==="balu1234@gmail.com"){
      response.render('allEvents', { title: 'AllEvents',name: request.user.firstName ,FormattedEventData,  csrfToken: request.csrfToken() });
    }
    else{
      console.log("hello")
      hex=0;
      response.render('SallEvents', { title: 'AllEvents',name: request.user.firstName ,FormattedEventData,  csrfToken: request.csrfToken() });
    }
  } catch (error) {
    console.error('Error fetching todos:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
  
});




sports.get("/deleteEvent", connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
  const eventId=request.query.eventId;
  console.log("ggdghfghfhfhF"+eventId)
  try{
  await AllEvents.destroy({
    where:{
      id:eventId
    }
  })
  response.redirect('/allEvents')
}
catch(err){
  console.log(err)
}
})


// ------------- USER FUNTIONALITIES -------------

let hex=0


sports.get('/dashBoard',  connectEnsureLogin.ensureLoggedIn(), (request, response) => {
  response.render('dashBoard', {name: request.user.firstName}); 
});

sports.get('/viewEvent', connectEnsureLogin.ensureLoggedIn(), async(request, response) => {

  try{
    const eventId=request.query.eventId;
  console.log(eventId);
    const eventCont = await AllEvents.findOne({
      where: {id:eventId}}
      );
      let flag=0;
      var enddate = new Date(eventCont.eventEndDate);
      if(enddate<new Date()){
        flag=1
      }
      console.log(eventCont.eventEndDate+"      "+new Date(),+"          "+flag)
      console.log(request.user.email)
    if(request.user.email==="balu1234@gmail.com"){
        response.render("viewEvent",{eventCont, eventId,flag,hex})
    }

    else{
      response.render("SviewEvent",{eventCont, eventId,flag,hex})
    }
  }
  catch(err){
    console.log(err);
}
});



sports.get("/myEvents", connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
      
      const currentUserId = request.user.id;
      const data = await Registers.findAll({
          attributes: ['id', 'userId', 'eventId'],
          where: {
              userId: currentUserId
          }
      });

      const eventIdArray = data.map(entry => entry.eventId);

      const formattedData = [];

      for (let i = 0; i < eventIdArray.length; i++) {
          const eventDetails = await AllEvents.findOne({
              where: {
                  id: eventIdArray[i]
              }
          });
          formattedData.push(eventDetails);
      }

      hex=1;
      response.render('myEvents', { formattedData ,name:request.user.firstName});
  } catch (error) {
      console.error("Error retrieving data:", error);
      response.status(500).send("Internal Server Error");
  }
});


sports.get("/viewRegisters",connectEnsureLogin.ensureLoggedIn(),async(request, response)=>{

  try {

    const eventId = request.query.eventId;
    const data = await Registers.findAll({
        attributes: ['id', 'userId', 'eventId'],
    });
    const temp=[];
    for(let i=0 ; i<data.length;i++){
        if(data[i].eventId==eventId){
          temp.push(data[i])
        }
    }

    const userIdArray = temp.map(entry => entry.userId);

    const formattedData = [];

    for (let i = 0; i < userIdArray.length; i++) {
        const userDetails = await User.findOne({
            where: {
                id: userIdArray[i]
            }
        });
        formattedData.push(userDetails);
    }

    
    response.render('viewRegisters', { formattedData ,name:request.user.firstName});
} catch (error) {
    console.error("Error retrieving data:", error);
    response.status(500).send("Internal Server Error");
}
})

sports.get("/registerEvent",connectEnsureLogin.ensureLoggedIn(),async(request, response)=>{
  const ev=request.query.eventId;
  try{
    await Registers.create({
      userId:request.user.id,
      eventId:ev

    })
    response.redirect("/myEvents");
  }
  catch(err){
    console.log(err)
  } 
})

sports.get("/unRegister",connectEnsureLogin.ensureLoggedIn(),async(request, response)=>{
  const ev=request.query.eventId;
  try{
    await Registers.destroy({
      where :{
        userId:request.user.id,
        eventId:ev
      }
    })
    response.redirect("/myEvents");
  }
  catch(err){
    console.log(err);
  }
})




module.exports=sports;
