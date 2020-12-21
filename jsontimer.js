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

        this.alarm = function(timerId) {
            if (node.timers[timerId]) {
                node.send({
                    topic:"alarm",
                    id: timerId
                })
                node.clearTimer(timerId);
                node.lastAlarmId = timerId;
                node.updateStatus();
            }
        }

        this.clearTimer = function(timerId, send) {
            if (node.timers[timerId] && node.timers[timerId].timeout) {
                clearTimeout(node.timers[timerId].timeout);
                delete node.timers[timerId]
                if (send) {
                    send({
                        topic: "clearedtimer",
                        id: timerId
                    })
                }
                node.updateStatus();
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
            if (payload["time"] && typeof payload.time == "object") {
                node.log("set command with time");
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
                    node.log("futureStr:"+futureStr);
                    node.log("nowStr:"+nowStr);
                    timeoutTime = (hoursFuture - hoursNow) * HOUR_TO_MILLISECONDS;
                    timeoutTime += (minutesFuture - minutesNow) * MINUTE_TO_MILLISECONDS;
                    timeoutTime += (secondsFuture - secondsNow) * 1000;
                    timeoutTime += millisecondsFuture - millisecondsNow;
                }
                else {
                    //tomorrow
                    node.log("Tomorrow alarm.")
                    node.log("futureStr:"+futureStr);
                    node.log("nowStr:"+nowStr);
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
                    node.log("set command with timeout:"+typeof payload.timeout);
                    timeoutTime = payload.timeout * 1;
                }
            }

            if (timeoutTime !== undefined) {
                node.timers[payload.id] = {
                    timeout: setTimeout(node.alarm, timeoutTime, payload.id)
                }
                if (send) {
                    send({
                        topic:"settimer",
                        id: payload.id,
                        timeout: timeoutTime
                    })
                }
                node.updateStatus();
            }
            else {
                if (send) {
                    send({
                        topic: "error",
                        id: payload.id,
                        error: "No time or timeout specified"
                    })
                }
            }
        }
        
		/* ===== Node-Red events ===== */
		this.on("input", function (msg, send, done) {
			send = send || function() { node.send.apply(node,arguments) };

            node.log("Msg for cul-max-jsontimer:"+JSON.stringify(msg));
            switch (msg.topic) {
                case "set": {
                    node.log("set command");
                    node.clearTimer(msg.payload.id, send);
                    node.setTimer(msg.payload, send);
                    break;
                }
                case "clear": {
                    node.log("clear command id:"+msg.payload.id);
                    node.clearTimer(msg.payload.id, send);
                    break;
                }
            }
            if (done) {
                done();
            }

        });

		this.on("close", function (removed, done) {
            // kill all timers
            for(var idx in node.timers) {
                node.clearTimer(idx);
            }
            if (done) {
                done();
            }
		});

	}

	RED.nodes.registerType("jsontimer", CULJsonTimerNode);

}
