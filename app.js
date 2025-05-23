const express=require ('express')
const app=express()
const session=require('express-session')
const path=require('path')
const env= require('dotenv').config()
const passport=require('./config/passport')
const userRouter=require('./routes/userRouter')
const adminRouter=require('./routes/adminRouter')
const cors = require('cors');
const db=require('./config/db')
//const { updateProductSalesPrice } = require('./controllers/admin/offerController');
db()

app.use(cors())


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

app.use('/',userRouter)
app.use('/admin',adminRouter)



// app.use((err, req, res, next) => {
    
//     if (err.name === 'CastError' && err.kind === 'ObjectId') {
//         return res.status(404).render('page-404');
//     }

//     res.status(500).render('admin-error');
// });


app.use((req, res) => {
    res.status(404).render('page-404');
});

app.use((err, req, res, next) => {
    console.error("Error:", err);

    if (res.headersSent) {
        return next(err); 
    }

    if (err.status === 404) {
        return res.status(404).render('page-404');
    }
    
    res.status(500).render('admin-error');
});


const PORT=process.env.PORT||4555
app.listen(PORT, '0.0.0.0',()=>console.log(`server running at http://localhost:${PORT}`))



module.exports=app;