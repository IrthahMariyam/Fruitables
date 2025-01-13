const express=require ('express')
const app=express()
const session=require('express-session')
const path=require('path')
const env= require('dotenv').config()
const passport=require('./config/passport')
const userRouter=require('./routes/userRouter')
const adminRouter=require('./routes/adminRouter')
const db=require('./config/db')
db()


app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(session({
secret:process.env.SESSION_SECRET,
resave:false,
saveUninitialized:true,
cookie:{
    secure:false,
    httpOnly:true,
    maxAge:72*60*60*1000
}
}))

app.use(passport.initialize())
app.use(passport.session())


app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next()
})

app.set('view engine','ejs')
app.set('views',[
    path.join(__dirname,"views/user"),
    path.join(__dirname,"views/admin")
])
app.use(express.static(path.join(__dirname,"public")))
//app.use(express.static('public'))

// app.use((req,res,next)=>{
// res.locals.user=res.session.user||null;
// res.locals.isGuest=req.session.user
// next()
// })
app.use('/',userRouter)
app.use('/admin',adminRouter)



const PORT=3000||process.env.PORT
app.listen(PORT,()=>console.log(`server running at http://localhost:${PORT}`))



module.exports=app;