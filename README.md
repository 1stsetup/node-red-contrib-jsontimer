<p>Use this to set timers to alarm at a specific time<br/>
<b>Input</b><br>
        Set topic to 'set' to set a timer or 'clear' to clear an existing timer<br>
        Following payload properties can be used:<br>
        <ul>
            <li>id: Specify the id for the timer. Can be used to clear it and will be set on events.</li>
            <li>timeout: A timeout value in milliseconds</li>
            <li>time: An object with following properties<BR>
            <ul>
                <li>hours: hour value of time to trigger the timer. Default 0</li>
                <li>minutes: minute value of time to trigger the timer. Default 0</li>
                <li>seconds: second value of time to trigger the timer. Default 0</li>
                <li>milliseconds: millisecond value of time to trigge the timer. Default 0</li>
            </ul>
                e.g.: For 22:13:36.010 specifiy { "hours": 22, "minutes":13, "seconds":36, "milliseconds": 10}</li>
        </ul>
        <b>Events</b><BR>
        Topic will contain one of following values:<BR>
        <ul>
            <li>settime: when time was set</li>
            <li>clearedtime: when time was cleared</li>
            <li>alarm: when timer triggered</li>
            <li>error: when an error occured during setting of timer</li>
        </ul>
        Id property will contain id of timer.<br>
        Error property will contain error text.
        </p>