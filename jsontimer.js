/**
 * Created by Michel Verbraak (info@1st-setup.nl).
 */

var util = require('util');
const fs = require('fs');
const path = require('path');

const HOUR_TO_MILLISECONDS = 60 * 60 * 1000;
const MINUTE_TO_MILLISECONDS = 60 * 1000;

module.exports = function (RED) {

	var self = this;

    function CULJsonTimerNode(config) {
		RED.nodes.createNode(this, config);
		this.name = config.name;
		var node = this;

        this.timers = {};
        this.lastAlarmId;

        node.savedFileName = `saved_jsontimers_${node.name != "" ? node.name : node.id}.json`;

        node.log("node.savedFileName:"+node.savedFileName);

		node.updateStatus = function() {
			let count = -1;
			for (var idx in node.timers) {
				count++;
			}

			node.status({
				fill: "green",
				shape: "dot",
				text: `${count} timers. ${node.lastAlarmId ? "Last alarm:"+node.lastAlarmId : ""}`
			});

		}

        this.alarm = function(timerId, alarmPayload) {
            if (node.timers[timerId]) {
                node.send({
                    topic:"alarm",
                    id: timerId,
                    payload: alarmPayload
                })
                node.clearTimer(timerId);
                node.lastAlarmId = timerId;
                node.updateStatus();
            }
        }

        this.clearTimer = function(timerId, send, doSave) {
            if (node.timers[timerId] && node.timers[timerId].timeoutHandle) {
                clearTimeout(node.timers[timerId].timeoutHandle);
                delete node.timers[timerId]
                if (send) {
                    send({
                        topic: "clearedtimer",
                        id: timerId
                    })
                }
                node.updateStatus();
                if (doSave) {
                    node.saveTimers();
                }
            }
        }
        
        function prependStr(inStr, len, prependChar) {
            let result = inStr+"";
            while (result.length < len) {
                result = prependChar + result;
            }
            return result;
        }

        this.setTimer = function(payload, send) {
            if (!payload["id"]) {
                if (send) {
                    send({
                        topic:"error",
                        error:"id missing"
                    })
                }
                return;
            }

            // Payload can have either on of two properties:
            //   - time object. This object specifies a time in the future when this timer should alarm
            //      e.g.: {"hours":22, "minutes":15,"seconds":0,"milliseconds":0} for 22:15:00.000 hours
            //   - timeout value: Value in milliseconds
            // Timeout property can have following properties {hour, minutes, seconds, milliseconds}
            let timeoutTime;
            let errorStr;
            if (payload["time"] && typeof payload.time == "object") {
                // node.log("set command with time");
                let hoursFuture = 0;
                let minutesFuture = 0;
                let secondsFuture = 0;
                let millisecondsFuture = 0;
                for(var idx in payload.time) {
                    switch (idx) {
                        case "hours": hoursFuture = payload.time[idx]*1; break;
                        case "minutes": minutesFuture = payload.time[idx]*1; break;
                        case "seconds": secondsFuture = payload.time[idx]*1; break;
                        case "milliseconds": millisecondsFuture = payload.time[idx]*1; break;
                    }
                }
                let futureStr = prependStr(hoursFuture,2,"0")+prependStr(minutesFuture,2,"0")+prependStr(secondsFuture,2,"0")+prependStr(millisecondsFuture,3,"0");

                let now = new Date();
                let hoursNow = now.getHours();
                let minutesNow = now.getMinutes();
                let secondsNow = now.getSeconds();
                let millisecondsNow = now.getMilliseconds();
                let nowStr = prependStr(hoursNow,2,"0")+prependStr(minutesNow,2,"0")+prependStr(secondsNow,2,"0")+prependStr(millisecondsNow,3,"0");
                // See if new time is before old time. So next day.
                if (futureStr > nowStr) {
                    // today
                    node.log("Today alarm.")
                    // node.log("futureStr:"+futureStr);
                    // node.log("nowStr:"+nowStr);
                    timeoutTime = (hoursFuture - hoursNow) * HOUR_TO_MILLISECONDS;
                    timeoutTime += (minutesFuture - minutesNow) * MINUTE_TO_MILLISECONDS;
                    timeoutTime += (secondsFuture - secondsNow) * 1000;
                    timeoutTime += millisecondsFuture - millisecondsNow;
                }
                else {
                    //tomorrow
                    node.log("Tomorrow alarm.")
                    // node.log("futureStr:"+futureStr);
                    // node.log("nowStr:"+nowStr);
                    timeoutTime = (hoursFuture * HOUR_TO_MILLISECONDS);
                    timeoutTime += (minutesFuture * MINUTE_TO_MILLISECONDS);
                    timeoutTime += (secondsFuture * 1000);
                    timeoutTime += millisecondsFuture;

                    timeoutTime += (23 - hoursNow) * HOUR_TO_MILLISECONDS;
                    timeoutTime += (59 - minutesNow) * MINUTE_TO_MILLISECONDS;
                    timeoutTime += (59 - secondsNow) * 1000;
                    timeoutTime += 1000 - millisecondsNow;
                }
            }
            else {
                if (payload["timeout"] && ((typeof payload.timeout == "string") || (typeof payload.timeout == "number") )) {
                    timeoutTime = payload.timeout * 1;
                }
                else {
                    if (payload["datetime"] && ((typeof payload.datetime == "string") || (typeof payload.datetime == "number") )) {
                        timeoutTime = (payload.datetime * 1) - Date.now();
                        if (timeoutTime <= 0) {
                            timeoutTime = undefined;
                            errorStr = "Saved timer is for alarming in the past so not activating it."
                            node.log(`${payload.id} : ${errorStr}`);
                        }
                    }    
                }
            }

            if (timeoutTime !== undefined) {
                let dateTime = Date.now() + timeoutTime;
                node.timers[payload.id] = {
                    timeoutHandle: setTimeout(node.alarm, timeoutTime, payload.id, payload.alarmPayload),
                    datetime: dateTime,
                    alarmPayload: payload.alarmPayload
                }
                if (send) {
                    send({
                        topic:"settimer",
                        id: payload.id,
                        timeout: timeoutTime,
                        datetime: (new Date(dateTime)).toString()
                    })
                }
                node.updateStatus();
                node.saveTimers();
            }
            else {
                if (send) {
                    send({
                        topic: "error",
                        id: payload.id,
                        error: errorStr ? errorStr : "No time or timeout specified"
                    })
                }
            }
        }
        
		node.loadTimers = function(data) {
            let count = 0;
			for(var idx in data) {
                if (idx != "getKeyByValue") {
                    count++;
                    node.setTimer({
                        id: idx,
                        datetime: data[idx].datetime,
                        alarmPayload: data[idx].alarmPayload
                    });
                }
            }
            if (count == 0) {
                node.updateStatus();
            }
		}

		this.saveTimers = function(done) {
			if (node.saving) return;

            node.saving = true;
            let newTimers = {};
            for(var idx in node.timers) {
                if (idx != "getKeyByValue") {
                    newTimers[idx] = {
                        datetime: node.timers[idx].datetime,
                        alarmPayload: node.timers[idx].alarmPayload
                    }
                }
            }
			fs.writeFile(node.savedFileName, JSON.stringify(newTimers,null,"\t"), (err) => {
                node.saving = false;
				if (done) {
					done();
				}
			});
		}

		// Load any saved jsontimers
		fs.stat(node.savedFileName, (err,stats) => {
			if (!err) {
				if (stats.isFile()) {
					node.status({
						fill: "green",
						shape: "ring",
						text: "Loading saved timers"
					});
					fs.readFile(node.savedFileName,(err, data) => {
						if (err) {
							node.updateStatus();
							return;
						}
						try {
							node.loadTimers(JSON.parse(data.toString()));
						}
						catch(err) {
							node.log(`Error loading data from file ${node.savedFileName}. Error:${err.stack}`)
						}
					})
				}
			}
		});

		/* ===== Node-Red events ===== */
		this.on("input", function (msg, send, done) {
			send = send || function() { node.send.apply(node,arguments) };

            switch (msg.topic) {
                case "set": {
                    node.clearTimer(msg.payload.id, send, true);
                    node.setTimer(msg.payload, send);
                    break;
                }
                case "clear": {
                    node.clearTimer(msg.payload.id, send, true);
                    break;
                }
                case "list": {
                    let newList = [];
                    for(var idx in node.timers) {
                        if (idx != "getKeyByValue") {
                            newList.push({
                                id:idx,
                                datetime: node.timers[idx].datetime,
                                dateTimeStr: (new Date(node.timers[idx].datetime)).toString(),
                                alarmPayload: node.timers[idx].alarmPayload
                            });
                        }
                    }
                            
                    if (send) {
                        send({
                            topic: "list",
                            timers: newList
                        });
                    }
                }
            }
            if (done) {
                done();
            }

        });

		this.on("close", function (removed, done) {
            // kill all timers
            node.log("Closing timers:"+node.id);
            node.saveTimers(() => {
                node.log("Saved timers on closing. Gogin to clear:"+node.id);
                for(var idx in node.timers) {
                    node.clearTimer(idx);
                }
                if (done) {
                    done();
                }    
            });
		});

	}

	RED.nodes.registerType("jsontimer", CULJsonTimerNode);

}
