// require('dotenv').config({path:'./env'})
import dotenv from 'dotenv'

import connectDB from './db/index.js';

dotenv.config({
    path: './env'
})

connectDB()















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
