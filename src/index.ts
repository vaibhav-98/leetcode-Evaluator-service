import bodyParser from 'body-parser';
import express from "express"

import serverConfig from "./config/serverConfig";


import { serverAdapter } from "./config/bullBoard";

import apiRouter from "./routes";
import SampleWorker from "./workers/sampleWorker";
import runPython from './containers/runPythonDocker';
//import sampleQueueProducer from "./producers/sampleQueueProducer";



const app = express()

app.use(bodyParser.urlencoded( { extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.text());

app.use("/api", apiRouter)

// mount bull-board router
app.use("/admin/queues", serverAdapter.getRouter());

app.listen(serverConfig.PORT, () => {
    console.log(`Server started at *:${serverConfig.PORT}`);
    console.log("Bull Board UI: http://localhost:5000/admin/queues");
     SampleWorker('SampleQueue');
      
  const code = `
x = input()
y = input()
print("value of x is", x)
print("value of y is", y)
`;

const inputCase = `100
200`;               

runPython(code, inputCase);
  
//    sampleQueueProducer('SampleJob', {
//     name: "vaibhav",
//     company: "PW",
//     position: "Tech Enginer",
//     location: "Remote | BLR | LKO"
// }, 1);
})