const Discord = require("discord.js");
const client = new Discord.Client();

const fs = require('fs');
const tokens = require("./tokens.json");
const settings = require('./settings.json');
const moment = require('moment');

function isCommand(message) {
    if (message.content === "<@!" + client.user.id + ">") {
        message.channel.send("My prefix is `" + settings.prefix + "`");
    }
    return (!message.author.bot && message.guild && (message.content.startsWith(settings.prefix) || message.content.startsWith("<@!" + client.user.id + ">")) && message.content != "<@!" + client.user.id + ">");
}

function parseCommand(message) {
    var r = {};
    var tag = "<@!" + client.user.id + ">";
    if (message.content.startsWith(settings.prefix)) {
        r.args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
        r.prefix = settings.prefix;
    } else {
        r.args = message.content.slice(tag.length + 1).trim().split(/ +/g);
        r.prefix = tag;
    }
    r.command = r.args.shift().toLowerCase();
    return r;
}

function updateStatus() {
    client.user.setActivity("for ics changes.", { type: 'WATCHING' });
}

function addListener(id, classe) {
    let found = false;
    classe = classe.toUpperCase();
    for (i = 0; i < settings.classes.length; i++) {
        if (settings.classes[i].name === classe && settings.classes[i].channel === id) {
            found = true;
        }
    }
    if (!found) {
        settings.classes.push({ channel: id, message: "", name: classe })
    }
    fs.writeFile("./settings.json", JSON.stringify(settings, null, 2), () => {});
}

function removeListener(id, classe) {
    classe = classe.toUpperCase();
    for (i = 0; i < settings.classes.length; i++) {
        console.log(settings.classes[i], id, classe)
        if (settings.classes[i].name === classe && settings.classes[i].channel === id) {
            settings.classes.splice(i, 1);
        }
    }
    fs.writeFile("./settings.json", JSON.stringify(settings, null, 2), () => {});
}

async function updateTimetables() {
    settings.classes.forEach(async(a, i) => {
        let channel = await client.channels.fetch(a.channel);
        let embed = {
            description: `${a.name} - Semaine ${moment().weekYear()}`,
            image: {
                url: settings.url.replace(/{}/g, a.name) + "?nocache=" + moment().toISOString()
            }
        };
        let msg;
        if (channel) {
            try {
                msg = await channel.messages.fetch(a.message);
            } catch (error) {
                msg = new Discord.MessageEmbed()
                await channel.send(msg).then(m => {
                    settings.classes[i].message = m.id;
                    msg = m;
                });
                fs.writeFile("./settings.json", JSON.stringify(settings, null, 2), () => {});
            }
            msg.edit({ embed: embed });
        }
    });
    updateStatus();
    setTimeout(updateTimetables, 600000);
}

client.on("ready", async() => {
    console.log(`Connected as ${client.user.username}`);
    updateTimetables();
});

client.on("message", async(message) => {
    if (isCommand(message)) {
        var r = parseCommand(message);
        var command = r.command;
        var args = r.args;
        switch (command) {
            case "help":
                message.channel.send({
                    embed: {
                        description: "Commandes disponibles: \n```\nadd <channel_id> <classe>\nremove <channel_id> <classe>\ninvite```",
                        footer: `Prefix: ${settings.prefix} || Made by Fouiny`
                    }
                })
                break;
            case "add":
                if (message.channel.permissionsFor(message.author.id).has("MANAGE_CHANNELS")) {
                    if (args.length === 2) {
                        let channel = await client.channels.fetch(args[0]).catch(() => {});
                        if (channel) {
                            message.channel.send({
                                embed: {
                                    description: `Si la classe fournie existe, une mise à jour sera publiée toutes les 10 minutes.`
                                }
                            });
                            addListener(channel.id, args[1]);
                        } else {
                            message.channel.send({
                                embed: {
                                    description: "L'id entré n'est pas valide."
                                }
                            });
                        }
                    } else {
                        message.channel.send({
                            embed: {
                                description: "Utilisation : `add <channel_id> <classe>`"
                            }
                        });
                    }
                } else {
                    message.channel.send({
                        embed: {
                            description: "Vous n'avez pas la permission `MANAGE_CHANNELS`"
                        }
                    });
                }
                break;
            case "remove":
                if (message.channel.permissionsFor(message.author.id).has("MANAGE_CHANNELS")) {
                    if (args.length === 2) {
                        let channel = await client.channels.fetch(args[0]);
                        if (channel) {
                            message.channel.send({
                                embed: {
                                    description: `Si l'entrée fournie existe, elle sera supprimée.`
                                }
                            });
                            removeListener(channel.id, args[1]);
                        } else {
                            message.channel.send({
                                embed: {
                                    description: "L'id entré n'est pas valide."
                                }
                            });
                        }
                    } else {
                        message.channel.send({
                            embed: {
                                description: "Utilisation : `remove <channel_id> <classe>`"
                            }
                        });
                    }
                } else {
                    message.channel.send({
                        embed: {
                            description: "Vous n'avez pas la permission `MANAGE_CHANNELS`"
                        }
                    });
                }
                break;
            case "invite":
                message.channel.send({
                    embed: {
                        description: `https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot`
                    }
                });
                break;
            default:
                break;
        }
    }
});

client.login(tokens.bot);