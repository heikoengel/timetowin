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

function fmtTime(time) {
    /** get time object as string in the format "HH:MM" **/
    return ("0" + time.getHours()).slice(-2) + ":" +
        ("0" + time.getMinutes()).slice(-2);
}

function fmtDelta(deltaminutes) {
    /** get timedelta in minutes as "XX min (X.YZh)" **/
    let hours_frac = parseFloat(deltaminutes / 60).toFixed(2);
    return deltaminutes + " min (" + hours_frac + "h)";
}

function deltaHHMM(deltaminutes) {
    /** get a timedelta in minutes as a string of hours and minutes **/
    let hours = Math.floor(deltaminutes / 60);
    let minutes = deltaminutes % 60;
    return hours + "h " + minutes + " min";
}

function deltaDec(deltaminutes, digits=2) {
    /** get a timedelta in minutes as fixed number of hours with [digits] digits **/
    let hours_frac = parseFloat(deltaminutes / 60).toFixed(digits);
    return hours_frac + "h";
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

function int(number) {
    /** shift by 0 ensures that the result is an integer and not fixed/float **/
    return number >> 0;
}

function get_time(str) {
    /** get Date() object from a time string **/
    var result = {
        value: 0,
        err: "\"" + str + "\"" + " is not a valid time"};
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
    var date = new Date(1970, 1, 1, hour, minute); // year/month/day don't matter
    if (isNaN(date)) {
        return result;
    }
    result.value = date;
    result.err = "";
    return result;
}

function dec_time(time) {
    /** get time as decimal, e.g. dec_time(get_time("12:15")) == 1215 **/
    return time.getHours() * 100 + time.getMinutes();
}

function update_time_calc(){

    const error = document.querySelector("#error-message");
    error.textContent = "";
    error.style.display = "none";

    const result = document.querySelector("#result-message");
    result.textContent = "";
    result.style.display = "none";

    const table = document.querySelector("#results-table");
    for (var row = table.rows.length - 1; row >= 0; row--) {
        table.deleteRow(row);
    }

    const timefield = document.querySelector("#times");
    let values = timefield.value.split(/[\s,-.;\n\r]+/);

    var times = new Array();
    var timerange = new Array();
    for(var i = 0; i < values.length; i++) {
        if(values[i].length == 0) {
            continue; // skip empty elements due to linebreaks, blanks, etc...
        }
        // parse input data as timestamps
        let time = get_time(values[i])
        if (time.err) {
            error.textContent = time.err;
            error.style.display = "block";
            return;
        };
        timerange.push(time.value);
        // arrange timestamps in pairs {start, end}
        if (timerange.length == 2) {
            // make sure time pair is in the right order
            if (timerange[0] > timerange[1]) {
                error.textContent = "Invalid range: " + fmtTime(timerange[0]) +
                    " is after " + fmtTime(timerange[1]);
                error.style.display = "block";
                return
            }
            // make sure start of current pair is after end of the last pair
            if (times.length > 0 && timerange[0] < times[times.length-1][1]) {
                error.textContent = "Invalid range: " + fmtTime(timerange[0]) +
                    " is after " + fmtTime(times[times.length-1][1]);
                error.style.display = "block";
                return
            }
            times.push(timerange);
            timerange = new Array();
        }
    }
    if (timerange.length == 1) {
        error.textContent = "Odd number of timestamps, add another time entry or \"now\" for the current time";
        error.style.display = "block";
        return;
    }
    if (times.length == 0) {
        error.textContent = "Add timestamp entries or \"now\" for the current time";
        error.style.display = "block";
        return;
    }

    var total_minutes = 0;
    let dec_start = dec_time(times[0][0]); // start time as decimal
    let dec_end = dec_time(times[times.length-1][1]); // end time as decimal

    let morning_break = int(15 * 60 * 1000);
    if (dec_start >= 930) {
        morning_break = 0; // No morning break when starting at or later than 9:30
    }
    if (dec_end <= 915) {
        morning_break = 0; // No morning break when end time before 9:15
    }
    if (dec_start > 915 && dec_start < 930) {
        // start after 9:15 but before 9:30 -> reduce break
        morning_break = int((930 - dec_start) * 60 * 1000);
    }

    let lunch_break = int(30 * 60 * 1000);
    if (dec_start >= 1230) {
        lunch_break = 0; // No lunch break when start time after 12:30
    }
    if (dec_end <= 1230) {
        lunch_break = 0; // No lunch break when stopping before 12:30
    }
    if (dec_start > 1200 && dec_start < 1230) {
        // start time after 12:00 but before 12:30 -> reduce break
        lunch_break = int((1230 - dec_start) * 60 * 1000);
    }
    if (dec_end > 1230 && dec_end < 1300) {
        //end time after 12:30 but before 13:00 -> reduce break
        lunch_break = int((30 - (1260 - dec_end)) * 60 * 1000);
    }

    var data = Array();
    for (var i = 0; i < times.length; i ++ ) {
        // time delta is in milliseconds
        let delta = int((times[i][1] - times[i][0]) / 1000 / 60);
        total_minutes += delta;
        var range = fmtTime(times[i][0]) + " - " + fmtTime(times[i][1]);
        var delta_hhmm = deltaHHMM(delta);
        var delta_dec = deltaDec(delta);
        let entry = [range, delta_hhmm, delta_dec];
        data.push(entry);

        if ((i < times.length - 1) && (times[i+1][0] > times[i][1])) {
            // non-zero break
            if (dec_time(times[i][1]) <= 930 && dec_time(times[i+1][0]) > 915) {
                // break between 9:15 and 9:30
                let break_time = (times[i+1][0] - times[i][1]);
                morning_break -=  Math.min(break_time, int(15 * 60 * 1000));
            }
            if (dec_time(times[i][1]) <= 1300 && dec_time(times[i+1][0]) > 1200) {
                // break between 12:00 and 13:00
                let break_start = get_time("12:00").value;
                if (times[i][1] > break_start) {
                    break_start = times[i][1];
                }
                let break_end = get_time("13:00").value;
                if (times[i+1][0] < break_end) {
                    break_end = times[i+1][0];
                }
                let break_time = (break_end - break_start);
                lunch_break -= Math.min(break_time, int(30 * 60 * 1000));
            }
        }
    }
    morning_break /= (60000); // microseconds to minutes
    lunch_break /= (60000);
    result.textContent = "Subtracted " + fmtDelta(morning_break) +
        " for morning  break and " + fmtDelta(lunch_break) +
        " for lunchtime break";
    let effective_delta = total_minutes - morning_break - lunch_break;
    //console.log("morning:" + int(morning_break / 1000 / 60));
    //console.log("lunch:" + int(lunch_break / 1000 / 60));

    for (var row = 0; row < data.length; row++) {
        addRow(data[row], table);
    }

    let entry = ["Total", deltaHHMM(effective_delta), deltaDec(effective_delta)];
    addRow(entry, table, "table-success");

    result.style.display = "block";
}

document.getElementById("times").addEventListener("input", function(e){
    update_time_calc()
});

document.getElementById("btn-update").addEventListener("click", function(e){
    update_time_calc()
});
