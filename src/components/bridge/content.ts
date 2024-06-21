/** SELECTE */
export const SELECTE_TYPE = ['SQLite', 'PostgreSQL', 'MySQL', 'MSSQL', 'MQTT', 'NATS'];
export const SUBSCRIBER_TYPE = ['mqtt', 'nats'];

/** HINT */
export const bridgeTypeHelper = (aType: string) => {
    switch (aType) {
        case 'sqlite':
            return 'SQLite';
        case 'postgres':
        case 'postgresql':
            return 'PostgreSQL';
        case 'mysql':
            return 'MySQL';
        case 'mssql':
            return 'MSSQL';
        case 'mqtt':
            return 'MQTT';
        case 'nats':
            return 'NATS';
        default:
            return aType;
    }
};
