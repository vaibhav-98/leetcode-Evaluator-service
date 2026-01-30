
import serverConfig from "./config/serverConfig";

import express from "express"
import apiRouter from "./routes";



const app = express()

app.use("/api", apiRouter)

app.listen(serverConfig.PORT, () => {
    console.log(`Server started at *:${serverConfig.PORT}`);
    
})