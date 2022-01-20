const {google} = require('googleapis');
var serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

/**
 * 
 * @param {String} sheetName: sheet with which to update db (of form "MONTH YEAR")
 */
async function getShifts(sheetName) {
    // Get client
    let jwtClient = new google.auth.JWT(
        serviceAccount.client_email,
        null,
        serviceAccount.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']);

    //authenticate request
    jwtClient.authorize(function (err, tokens) {
    if (err) {
        console.log(err);
    return;
    } else {
        console.log("Successfully authed on sheets api");
    }
    });

    // Request sheet
    const sheets = google.sheets("v4");
    const res = await sheets.spreadsheets.get(
        {
            auth: jwtClient,
            spreadsheetId: process.env.SCHED_SHEETS_ID,
            ranges: [`${sheetName}!A1:H22`],
            includeGridData: true
        }
    );
    
    // Return null if no sheet found
    if (!res.data.sheets || res.data.sheets.length == 0) {
        return null;
    }
    const dat = res.data.sheets[0].data[0];

    // Get year from sheet name
    let year = sheetName.split(' ');
    year = year[year.length - 1];

    // Init values
    const shifts = [];
    let cell = '';
    let date = '';
    let anchorRow = 0;

    // Parse row by row
    for (let j=0; j<dat.rowData.length; j++) {
        const rowDat = dat.rowData[j].values;

        // If header row (dates), mark down row number as anchor, then skip
        if (rowDat[1].formattedValue && isFormattedDate(rowDat[1].formattedValue)) {
            anchorRow = j;
            continue;
        }

        // If footer row, skip. Helps with parsing below
        if (rowDat[0].formattedValue == 'Scheduling Issues?') {
            continue;
        };

        // Cell by cell (note that we skip leftmost column, which is labels col.)
        for (let k=1; k<rowDat.length; k++) {
            cell = rowDat[k];

            // If cell has black background, it is a header for a shift. 
            if (Object.keys(cell.effectiveFormat.backgroundColor).length == 0) {
                // If first item under header is empty or label, skip this header
                const members = [];
                const testMember = memberObjFromCell(dat.rowData[j+1].values[k])
                if (testMember == null || testMember.name == '1A Crew Chief') {
                    continue;
                } else {
                    members.push(testMember);
                };

                // search 3 places below testMember to grab other member names
                let member = null;
                for (let kk=2; kk<5; kk++) {
                    member = memberObjFromCell(dat.rowData[j+kk].values[k])
                    if (member != null && member.name != '') {
                        members.push(member);
                    };
                };

                // Search anchor row for date
                date = dat.rowData[anchorRow].values[k].formattedValue;

                // Get time from offset from anchor
                const weekday = date.split(',')[0].toLowerCase();
                let isWeekend = false;
                if (['friday', 'saturday'].includes(weekday)) {
                    isWeekend = true;
                };
                const {start, end} = headerOffsetToTime(j - anchorRow, isWeekend);

                // Create shift object to be parsed later
                shifts.push({
                    members,
                    date: `${date}, ${year}`,
                    start,
                    end
                });
            }
        }
    }


    // Parse shifts to be more useful for backend later
    return parseShifts(shifts);
}

/**
 * 
 * @param {String} str: string to be parsed
 * 
 * If string is of the form WEEKDAY, MONTH, DAY, return true.
 * 
 * Not meant to cover every edge case! Just meant to check if a given cell is a date or not (ie. name or time).
 * Will not check if a date is a valid one (Monday, February 30 is valid)
 */
function isFormattedDate(str) {
    const DAYS = [
        'monday,',
        'tuesday,',
        'wednesday,',
        'thursday,',
        'friday,',
        'saturday,',
        'sunday,'
    ];

    const MONTHS = [
        'january',
        'february',
        'march',
        'april',
        'may',
        'june',
        'july',
        'august',
        'september',
        'october',
        'november',
        'december'
    ]

    const chunks = str.split(' ');
    

    if (chunks.length < 3) {
        return false;
    } else if (!DAYS.includes(chunks[0].toLowerCase())) {
        return false;
    } else if (!MONTHS.includes(chunks[1].toLowerCase())) {
        return false;
    } else if (!parseInt(chunks[2]) || parseInt(chunks[2]) < 0 || parseInt(chunks[2] > 31)) {
        return false;
    };

    return true;
}

/**
 * 
 * @param {Integer} offset: offset from date row
 * 
 * Convert an offset from date row to a time value (start and end) from our internal schedule on google sheets
 * 
 * https://docs.google.com/spreadsheets/d/1JWyNPjiXPWcTbqjcgtpcEqN8hZVMdWdUn0kf40uEIqQ/edit#gid=765254816
 * 
 * On weekends (friday night, saturday night), overnights end at 10am next day
 */
function headerOffsetToTime(offset, weekend=false) {
    switch (offset) {
        case 1:
            return {start: '10:00:00', end: '13:30:00'};
        case 6:
            return {start: '13:30:00', end: '17:00:00'};
        case 11:
            return {start: '17:00:00', end: '23:00:00'};
        case 16:
            if (weekend) {
                return {start: '23:00:00', end: '10:00:00'};
            } else {
                return {start: '23:00:00', end: '07:00:00'};
            };
        default:
            return null;
    }
}

/**
 * 
 * @param {Obj} cell 
 * 
 * Return object with member name, and rank (from color). Return null if color is red (either NEED COVERAGE
 * or no shift) or formattedValue is empty
 */
function memberObjFromCell(cell) {
    if (cell == null || cell == undefined) {
        return null;
    };

    const color = cell.effectiveFormat.backgroundColor;
    const cl = Object.keys(color).length;
    const str = cell.formattedValue;
    let role = '';
    
    if (cl == 1 && color.green == 1) {
        role = 'Crew Chief';
    } else if (cl == 1 && color.red == 1) {
        return null;
    } else if (cl == 2 && color.green == .6 && color.red == 1) {
        role = 'Lead';
    } else if (cl == 2 && color.red == 1 && color.green == 1) {
        role = 'EMT';
    } else {
        return null;
    }

    return {
        name: str,
        role
    };
}

/**
 * 
 * @param {[Obj]} shifts 
 * @returns shifts
 * 
 * Utility function to parse dates and distribute them to members in data structure. Does not add
 * user data from database such as userId and pushToken.
 */
function parseShifts(shifts) {
    const till_regex = /\wtill\w(\d\d:\d\d)/

    return shifts.map(shift => {
        // Format start, end into date objects based on date
        const dChunks = shift.date.split(' ');
        const year = dChunks[3];
        const day = dChunks[2].slice(0, -1);
        const month = dChunks[1];

        shift.start = new Date(`${month} ${day}, ${year} ${shift.start}`);
        let endTime = shift.end;
        shift.end = new Date(`${month} ${day}, ${year} ${endTime}`);

        if (shift.end < shift.start) {
            shift.end = new Date(shift.end.getTime() + 24*60*60*1000);
        }
        delete shift.date;

        // For each member, check null and modify in case of special chars
        let member = null;
        for (let i=0; i<shift.members.length; i++) {
            member = shift.members[i];

            if (member == null || member.name.length == 0) {
                members.splice(i, 1);
                continue;
            };

            // Set start, end as shift start, end by default
            member.start = shift.start;
            member.end = shift.end;
            
            // Check for time modifiers
            if (member.name.includes('@')) {
                const nChunks = member.name.split('@');
                member.name = nChunks[0];
                member.start = new Date(`${month} ${day}, ${year} ${nChunks[1].trim()}:00`);
            } else if (till_regex.test(member.name)) {
                // Try to beat Scunthorpe
                const tillTime = member.name.match(till_regex)[1];
                member.name = member.name.replace(till_regex, '');
                member.end = new Date(`${month} ${day}, ${year} ${tillTime}:00`)
            }

            // Remove tokens in parenthesis
            member.name = member.name.replace(/\(.+\)/, '');
            // Remove asterisks
            member.name = member.name.replace('*', '');
        };

        return shift;
    });
}

module.exports = {
    getShifts: getShifts
}
