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
                const testMember = dat.rowData[j+1].values[k].formattedValue;
                if (testMember == undefined || testMember == '1A Crew Chief') {
                    continue;
                } else {
                    members.push(testMember);
                };

                // search 3 places below testMember to grab other member names
                let member = ''
                for (let kk=2; kk<5; kk++) {
                    member = dat.rowData[j+kk].values[k].formattedValue;
                    if (member != undefined && member != '') {
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

    return shifts;
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

module.exports = {
    getShifts: getShifts
}
