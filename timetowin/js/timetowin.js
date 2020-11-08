/**

TimeToWIN Time Calculation in Javascript
Copyright (C) 2020 Heiko Engel

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

**/

class Timestamp {

    constructor(hour_or_ts, minute=0) {
        if (hour_or_ts instanceof Timestamp) {
            this.hour = hour_or_ts.hour;
            this.minute = hour_or_ts.minute;
        } else {
            this.hour = hour_or_ts;
            this.minute = minute;
        }
    }

    add(ts, min=0) {
        if (ts instanceof Timestamp) {
            this.hour += ts.hour;
            this.minute += ts.minute;
        } else {
            this.hour += ts;
            this.minute += min;
        }
        while (this.minute > 60) {
            this.hour += 1;
            this.minute -= 60;
        }
    }

    sub(ts, min=0) {
        if (ts instanceof Timestamp) {
            this.hour -= ts.hour;
            this.minute -= ts.minute;
        } else {
            this.hour -= ts;
            this.minute -= min;
        }
        while (this.minute < 0) {
            this.hour -= 1;
            this.minute += 60;
        }
    }

    minutes() {
        return this.hour * 60 + this.minute;
    }

    set(hour, min=0) {
        if (hour instanceof Timestamp) {
            this.hour = hour.hour;
            this.minute = hour.minute;
        } else {
            this.hour = hour;
            this.minute = min;
        }
    }

    cmp(op, ts, min=0) {
        let minutes = 0;
        if (ts instanceof Timestamp) {
            minutes = ts.hour * 60 + ts.minute;
        } else {
            minutes = ts * 60 + min;
        }
        switch(op) {
        case "lt":
            return this.minutes() < minutes;
        case "gt":
            return this.minutes() > minutes;
        case "lte":
            return this.minutes() <= minutes;
        case "gte":
            return this.minutes() >= minutes;
        default:
            throw "Invalid compare operation";
        }
    }

    strHHMM() {
        return ("0" + this.hour).slice(-2) + ":" +
            ("0" + this.minute).slice(-2);
    }

    strDec(digits=2) {
        return parseFloat(this.minutes() / 60).toFixed(digits);
    }

}


function addRow(fields, obj, trclass="") {
    /** add a row of fields to a table object **/
    var row = obj.insertRow(obj.rows.length); // insert at the end
    if (trclass != "") {
        row.setAttribute("class", trclass);
    }
    for (var field = 0; field < fields.length; field++) {
        let cell = row.insertCell(field);
        cell.innerHTML = fields[field];
    }
}


function str_to_timestamp(str) {
    /** get Timestamp() object from a time string **/
    var result = {
        value: 0,
        err: "\"" + str + "\"" + " is not a valid timestamp"};
    let now = new Date();
    let hour = now.getHours();
    let minute = now.getMinutes();
    if (str.toLowerCase() != "now") {
        elems = str.split(":");
        if (elems.length != 2) {
            return result;
        }
        hour = Number(elems[0]);
        if (hour < 0 || hour > 23) {
            return result;
        }
        minute = Number(elems[1]);
        if (minute < 0 || minute > 59) {
            return result;
        }
    }
    var ts = new Timestamp(hour, minute);
    result.value = ts;
    result.err = "";
    return result;
}

function calculate_time(input_str) {
    let values = input_str.split(/[\s,-.;\n\r]+/);
    var timerange = new Array(); // timerange tuple [start, end]
    var times = new Array(); // list of timerange tuples
    for(var i = 0; i < values.length; i++) {
        if(values[i].length == 0) {
            continue; // skip empty elements, e.g. due to linebreaks, blanks, etc...
        }
        // parse input data as timestamps
        let time = str_to_timestamp(values[i])
        if (time.err) {
            return {err: time.err};
        };
        timerange.push(time.value);

        // arrange timestamps in pairs [start, end]
        if (timerange.length == 2) {
            // make sure time pair is in the right order
            if (timerange[0].cmp("gt", timerange[1])) {
                return {err: "Invalid order of timestamps: " +
                        timerange[0].strHHMM() + " is after " +
                        timerange[1].strHHMM()};
            }
            // make sure start of current pair is after end of the last pair
            if (times.length > 0 && timerange[0].cmp("lt", times[times.length-1][1])) {
                return {err: "Invalid order of ranges: " + timerange[0].strHHMM() +
                        " is after " + times[times.length-1][1].strHHMM()};
            }
            times.push(timerange); // push to times list
            timerange = new Array(); // clear timerange tuple
        }
    }

    if (timerange.length == 1) {
        return {err: "Odd number of timestamps, add another time entry or \"now\" for the current time"};
    }
    if (times.length == 0) {
        return {err: "Add timestamp entries or \"now\" for the current time"};
    }

    var total_time = new Timestamp(0, 0);
    let start = times[0][0];
    let end = times[times.length-1][1];

    let morning_break = new Timestamp(0, 15); // 15 minutes
    if (start.cmp("gte", 9, 30)) {
        morning_break.set(0); // No morning break when starting at or later than 9:30
    }
    if (end.cmp("lte", 9, 15)) {
        morning_break.set(0); // No morning break when end time before 9:15
    }
    if (start.cmp("gte", 9, 15) && start.cmp("lt", 9, 30)) {
        // start after 9:15 but before 9:30 -> reduce break
        morning_break.set(9, 30);
        morning_break.sub(start);
    }

    let lunch_break = new Timestamp(0, 30); // 30 minutes
    if (start.cmp("gte", 12, 30)) {
        lunch_break.set(0); // No lunch break when start time after 12:30
    }
    else if (end.cmp("lte", 12, 30)) {
        lunch_break.set(0); // No lunch break when stopping before 12:30
    }
    else if (start.cmp("gt", 12, 00) && start.cmp("lt", 12, 30)) {
        // start time after 12:00 but before 12:30 -> reduce break
        lunch_break.set(12, 30);
        lunch_break.sub(start);
    }
    else if (end.cmp("gt", 12, 30) && end.cmp("lt", 13, 00)) {
        // end time after 12:30 but before 13:00 -> reduce break
        let delta = new Timestamp(13, 00);
        delta.sub(end);
        lunch_break.sub(delta);
    }

    var data = Array();
    for (var i = 0; i < times.length; i ++ ) {
        let delta = new Timestamp(times[i][1]);
        delta.sub(times[i][0]); // delta between start timestamp and end timestamp
        total_time.add(delta); // add delta to total time
        var range = times[i][0].strHHMM() + " - " + times[i][1].strHHMM();
        let entry = [range, delta.strHHMM(), delta.strDec()];
        data.push(entry);

        // evaluate the breaks between time ranges
        if ((i < times.length - 1) && times[i+1][0].cmp("gt", times[i][1])) {
            // non-zero break
            if (times[i][1].cmp("lte", 9, 30) && times[i+1][0].cmp("gte", 9, 15)) {
                // break between 9:15 and 9:30
                let break_start = new Timestamp(9, 15);
                if (times[i][1].cmp("gt", break_start)) {
                    break_start = times[i][1];
                }
                let break_end = new Timestamp(9, 30);
                if (times[i+1][0].cmp("lt", break_end)) {
                    break_end = times[i+1][0];
                }
                let break_time = new Timestamp(break_end);
                break_time.sub(break_start);
                if (break_time.minutes() > 15) {
                    break_time.set(0, 15);
                }
                morning_break.sub(break_time);
            }
            if (times[i][1].cmp("lte", 13, 00) && times[i+1][0].cmp("gte", 12, 00)) {
                // break between 12:00 and 13:00
                let break_start = new Timestamp(12, 00);
                if (times[i][1].cmp("gt", break_start)) {
                    break_start = times[i][1];
                }
                let break_end = new Timestamp(13, 00);
                if (times[i+1][0].cmp("lt", break_end)) {
                    break_end = times[i+1][0];
                }
                let break_time = new Timestamp(break_end);
                break_time.sub(break_start);
                if (break_time.minutes() > 30) {
                    break_time.set(0, 30);
                }
                lunch_break.sub(break_time);
            }
        }
    }

    // reduce total time by breaks
    let effective_time = new Timestamp(total_time);
    effective_time.sub(morning_break);
    effective_time.sub(lunch_break);

    return {total_time: total_time, effective_time: effective_time,
            morning_break: morning_break, lunch_break: lunch_break,
            data: data, err:""};
}


function update_page(){

    const error = document.querySelector("#error-message");
    error.textContent = "";
    error.style.display = "none";

    const result = document.querySelector("#result-message");
    result.textContent = "";
    result.style.display = "none";

    const table = document.querySelector("#results-table");
    for (var row = table.rows.length - 1; row >= 0; row--) {
        table.deleteRow(row);  // delete all old rows from table
    }

    // get text from input field
    const timefield = document.querySelector("#times");

    // calculate the results
    let ret = calculate_time(timefield.value);
    if (ret.err) {
        error.textContent = ret.err;
        error.style.display = "block";
        return;
    }

    // set infobox content
    result.textContent = "Subtracted " + ret.morning_break.strHHMM() + " (" +
        ret.morning_break.strDec() + "h) for morning  break and " +
        ret.lunch_break.strHHMM() + " (" + ret.lunch_break.strDec() +
        "h) for lunchtime break";

    // fill calculation results into the table
    for (var row = 0; row < ret.data.length; row++) {
        addRow(ret.data[row], table);
    }

    // append the 'total' row to the table
    let entry = ["Total", ret.effective_time.strHHMM(),
                 ret.effective_time.strDec()];
    addRow(entry, table, "table-success");

    result.style.display = "block";
}

// update the results each time a character is changed in the input text field
document.getElementById("times").addEventListener("input", function(e){
    update_page()
});

// update the results when the 'update' button is clicked
document.getElementById("btn-update").addEventListener("click", function(e){
    update_page()
});
