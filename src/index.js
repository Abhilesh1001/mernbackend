// require('dotenv').config({path:'./env'})
import dotenv from 'dotenv'
import { app } from './app.js';

import connectDB from './db/index.js';

dotenv.config({
    path: './env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT|| 8000,()=>{
        console.log(`Server is running at port ${process.env.PORT}`)
    })
})
.catch((error)=>{
    console.log('MONGO db connection failed !!!',err)
})













/*
;(async ()=>{

    try{
        
        await mongooes.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on('error',(error)=>{

            console.log('ERRR : ',error)
            throw error 
        })
        
        app.listen(process.env.PORT,()=>{
            console.log(`APP is listining on port ${process.env.PORT}`)
        })

    }catch(error){
        console.log(error)
    }


})()
*/
