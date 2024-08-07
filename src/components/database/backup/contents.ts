export const backupTable = {
    columns: ['', '', ''],
    rows: [
        ['Full backup', 'Backup of entire data'],
        ['Incremental backup', 'Backup of the data added after the full or previous incremental backup'],
        ['Duration backup', 'Backup of data for a specific period'],
    ],
};
export const backupSyntax = `# Full backup
BACKUP [ DATABASE | TABLE table_name ]  INTO [ DISK ] = 'path/backup_name';
time_duration = FROM start_time TO end_time

# Incremental backup
BACKUP [ DATABASE | TABLE table_name ] AFTER 'previous_backup_dir' INTO [ DISK ] = 'path/backup_name';

# Duration backup
BACKUP [ DATABASE | TABLE table_name ]  [ time_duration ] INTO [ DISK ] = 'path/backup_name';`;
export const explainPathAndTime = ` Absolute and relative path can be used for backup directory. set start time and end time of backup data for time_duration.`;
export const exampleBackup = `-- Full backup backup
BACKUP DATABASE INTO DISK = 'backup_dir_name';

-- Incremental backup
BACKUP DATABASE AFTER 'previous_backup_dir' INTO DISK = 'path/backup_name';

-- Time range backup
BACKUP DATABASE FROM TO_DATE('2015-07-14 00:00:00','YYYY-MM-DD HH24:MI:SS')
                TO TO_DATE('2015-07-14 23:59:59','YYYY-MM-DD HH24:MI:SS')
                INTO DISK = '/home/machbase/backup_20150714'`;
export const explainEtc1 =
    'When executing the backup command, the backup type and backup destination path must be defined. To back up the entire database, you must specify “DATABASE”. To back up specific tables, specify “TABLE” as the backup type. When backing up specific tables, you must specify the table name.';
export const explainEtc2 =
    'You can specify the backup destination using the time_duration clause. Specify the start time and end time of the backup target data in the FROM and TO clauses. In the example above, “2015-07-14 00:00:00” is defined as FROM and “2015-07-14 23:59:59” is defined as TO, so the user will be able to see all data for July 14, 2015 Quot; Duration If you do not specify a time condition, “1970-01-01 00:00:00” is set to FROM and the current time at which it is executed is set in the TO clause.';
export const explainEtc3 =
    'Note that when specifying a backup path, backup files are created under “$ MACHBASE_HOME / dbs” when a relative path is specified. To specify an absolute path, you must always set a path that starts with “/”.';
