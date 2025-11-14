const readline = require("readline");
const { exec } = require("child_process");


const rl = readline.createInterface({
    input : process.stdin,
    output : process.stdout,
    prompt : "$ "
});


const HOME_DIR = process.env.HOME || process.env.USERPROFILE;
const cmdsName = ["echo", "pwd", "exit","type","cd"];

function parseInput(input){
    return input.match(/(?:[^\s'"]+|['"][^'"]*['"])+/g) || [];
}

const commands = {
    cd: async (args) => {
        if (args.length > 1) {
            console.log("bash: cd: too many arguments");
            return;
        }

        let targetDir = args[0]
            ? args[0].replace(/^~(?=$|[\\/])/, HOME_DIR)
            : HOME_DIR;

        try {
            process.chdir(targetDir);
        } catch (err) {
            console.log(`cd: ${targetDir}: No such file or directory`);
        }
    },
    type : async (args)=>{
        if(cmdsName.includes(args[0])){
            console.log(`${args[0]} is a shell builtin`);
        }
        else{
            await new Promise((resolve)=>{
                exec(`which ${args[0]}`, (err, stdout, stderr)=>{
                    if (err) console.error(`${args[0]}: not found`);
                    else console.log(`${args[0]} is ${stdout.trim()}`);
                    resolve();
                })
            })
    }
    },
    echo : async (args)=>{
        console.log(args.join(" ").replace(/\\(?![a-zA-Z\\$"])|[^\\]['"]/g,"") + "\n");
    },
    pwd : async ()=>{
        console.log(process.cwd());
    }
}
let code = 0;


rl.prompt();
rl.on("line", async (input)=>{
    const [cmd, ...args] = parseInput(input);
    if(!cmd){
        return rl.prompt();
    }
    switch(cmd){
        case "exit" :
            code = args[0]?parseInt(args[0]):0;
            rl.close(args[0]);
            return;
        default :
            if(commands[cmd]) await commands[cmd](args);
            else console.log(`${cmd}: command not found`);
    }
    rl.prompt();
});
    
rl.on("close",()=>{
    console.log("# Shell exits with code " + code);
    rl.removeAllListeners();
    process.exit(0);
});