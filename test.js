const readline  = require("readline");
const {exec} = require("child_process");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "$ "
});

const cmdName = ["echo","type","cd","pwd"];

rl.prompt();


rl.on("line", input => {
    const [cmd, ...args] = input.trim("").split(/\s+/); 
    if(cmd==="type"){
        exec(`which ${args[0]}`, (err,stdout,stderr)=>{
            if(err) console.log("not found");
            else console.log(`${cmd} exist at ${stdout}`);
        })
    }
    rl.prompt();
})