Use this to set timers to alarm at a specific time

<b>Input</b>

Set topic to 'set' to set a timer or 'clear' to clear an existing timer
Following payload properties can be used:

* id: Specify the id for the timer. Can be used to clear it and will be set on events.
* timeout: A timeout value in milliseconds
* time: An object with following properties

    * hours: hour value of time to trigger the timer. Default 0
    * minutes: minute value of time to trigger the timer. Default 0
    * seconds: second value of time to trigger the timer. Default 0
    * milliseconds: millisecond value of time to trigge the timer. Default 0

        e.g.: For 22:13:36.010 specifiy { "hours": 22, "minutes":13, "seconds":36, "milliseconds": 10}

<b>Events</b>

Topic will contain one of following values:
* settime: when time was set
* clearedtime: when time was cleared
* alarm: when timer triggered
* error: when an error occured during setting of timer

Id property will contain id of timer.<br>
Error property will contain error text.


Example flow:
```json
[{"id":"ec99b4da.293d4","type":"tab","label":"jsontimer example","disabled":false,"info":""},{"id":"7279d624.7be1e","type":"jsontimer","z":"ec99b4da.293d4","name":"","x":440,"y":200,"wires":[["f7b7a7a8.610e08"]]},{"id":"f7b7a7a8.610e08","type":"debug","z":"ec99b4da.293d4","name":"timerout","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","statusVal":"","statusType":"auto","x":620,"y":200,"wires":[]},{"id":"781c568e.7274d","type":"inject","z":"ec99b4da.293d4","name":"20 seconds","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"set","payload":"{\"id\":\"This is a test\",\"timeout\":20000}","payloadType":"json","x":200,"y":120,"wires":[["7279d624.7be1e","af6927b1.cf26b"]]},{"id":"af6927b1.cf26b","type":"debug","z":"ec99b4da.293d4","name":"timer in","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","statusVal":"","statusType":"auto","x":440,"y":120,"wires":[]},{"id":"65d3a29.abf2fdc","type":"inject","z":"ec99b4da.293d4","name":"Clear 20 seconds timer","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"clear","payload":"{\"id\":\"This is a test\"}","payloadType":"json","x":200,"y":280,"wires":[["7279d624.7be1e"]]}]
```