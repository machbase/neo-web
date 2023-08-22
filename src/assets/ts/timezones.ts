interface IanaTimezone {
    id: string;
    name: string;
}

const IANA_TIMEZONES = [
    {
        id: 'UTC',
        name: 'UTC',
    },
    {
        id: 'LOCAL',
        name: 'LOCAL',
    },
    {
        id: 'Africa/Abidjan',
        name: 'Africa/Abidjan (GMT)',
    },
    {
        id: 'Africa/Accra',
        name: 'Africa/Accra (GMT)',
    },
    {
        id: 'Africa/Addis_Ababa',
        name: 'Africa/Addis Ababa (EAT)',
    },
    {
        id: 'Africa/Algiers',
        name: 'Africa/Algiers (CET)',
    },
    {
        id: 'Africa/Asmara',
        name: 'Africa/Asmara (EAT)',
    },
    {
        id: 'Africa/Bamako',
        name: 'Africa/Bamako (GMT)',
    },
    {
        id: 'Africa/Bangui',
        name: 'Africa/Bangui (WAT)',
    },
    {
        id: 'Africa/Banjul',
        name: 'Africa/Banjul (GMT)',
    },
    {
        id: 'Africa/Bissau',
        name: 'Africa/Bissau (GMT)',
    },
    {
        id: 'Africa/Blantyre',
        name: 'Africa/Blantyre (CAT)',
    },
    {
        id: 'Africa/Brazzaville',
        name: 'Africa/Brazzaville (WAT)',
    },
    {
        id: 'Africa/Bujumbura',
        name: 'Africa/Bujumbura (CAT)',
    },
    {
        id: 'Africa/Cairo',
        name: 'Africa/Cairo (EET)',
    },
    {
        id: 'Africa/Casablanca',
        name: 'Africa/Casablanca (WEST)',
    },
    {
        id: 'Africa/Ceuta',
        name: 'Africa/Ceuta (CEST)',
    },
    {
        id: 'Africa/Conakry',
        name: 'Africa/Conakry (GMT)',
    },
    {
        id: 'Africa/Dakar',
        name: 'Africa/Dakar (GMT)',
    },
    {
        id: 'Africa/Dar_es_Salaam',
        name: 'Africa/Dar es Salaam (EAT)',
    },
    {
        id: 'Africa/Djibouti',
        name: 'Africa/Djibouti (EAT)',
    },
    {
        id: 'Africa/Douala',
        name: 'Africa/Douala (WAT)',
    },
    {
        id: 'Africa/El_Aaiun',
        name: 'Africa/El Aaiun (WEST)',
    },
    {
        id: 'Africa/Freetown',
        name: 'Africa/Freetown (GMT)',
    },
    {
        id: 'Africa/Gaborone',
        name: 'Africa/Gaborone (CAT)',
    },
    {
        id: 'Africa/Harare',
        name: 'Africa/Harare (CAT)',
    },
    {
        id: 'Africa/Johannesburg',
        name: 'Africa/Johannesburg (SAST)',
    },
    {
        id: 'Africa/Juba',
        name: 'Africa/Juba (EAT)',
    },
    {
        id: 'Africa/Kampala',
        name: 'Africa/Kampala (EAT)',
    },
    {
        id: 'Africa/Khartoum',
        name: 'Africa/Khartoum (EAT)',
    },
    {
        id: 'Africa/Kigali',
        name: 'Africa/Kigali (CAT)',
    },
    {
        id: 'Africa/Kinshasa',
        name: 'Africa/Kinshasa (WAT)',
    },
    {
        id: 'Africa/Lagos',
        name: 'Africa/Lagos (WAT)',
    },
    {
        id: 'Africa/Libreville',
        name: 'Africa/Libreville (WAT)',
    },
    {
        id: 'Africa/Lome',
        name: 'Africa/Lome (GMT)',
    },
    {
        id: 'Africa/Luanda',
        name: 'Africa/Luanda (WAT)',
    },
    {
        id: 'Africa/Lubumbashi',
        name: 'Africa/Lubumbashi (CAT)',
    },
    {
        id: 'Africa/Lusaka',
        name: 'Africa/Lusaka (CAT)',
    },
    {
        id: 'Africa/Malabo',
        name: 'Africa/Malabo (WAT)',
    },
    {
        id: 'Africa/Maputo',
        name: 'Africa/Maputo (CAT)',
    },
    {
        id: 'Africa/Maseru',
        name: 'Africa/Maseru (SAST)',
    },
    {
        id: 'Africa/Mbabane',
        name: 'Africa/Mbabane (SAST)',
    },
    {
        id: 'Africa/Mogadishu',
        name: 'Africa/Mogadishu (EAT)',
    },
    {
        id: 'Africa/Monrovia',
        name: 'Africa/Monrovia (GMT)',
    },
    {
        id: 'Africa/Nairobi',
        name: 'Africa/Nairobi (EAT)',
    },
    {
        id: 'Africa/Ndjamena',
        name: 'Africa/Ndjamena (WAT)',
    },
    {
        id: 'Africa/Niamey',
        name: 'Africa/Niamey (WAT)',
    },
    {
        id: 'Africa/Nouakchott',
        name: 'Africa/Nouakchott (GMT)',
    },
    {
        id: 'Africa/Ouagadougou',
        name: 'Africa/Ouagadougou (GMT)',
    },
    {
        id: 'Africa/Porto-Novo',
        name: 'Africa/Porto-Novo (WAT)',
    },
    {
        id: 'Africa/Sao_Tome',
        name: 'Africa/Sao_Tome (GMT)',
    },
    {
        id: 'Africa/Tripoli',
        name: 'Africa/Tripoli (EET)',
    },
    {
        id: 'Africa/Tunis',
        name: 'Africa/Tunis (CET)',
    },
    {
        id: 'Africa/Windhoek',
        name: 'Africa/Windhoek (WAT)',
    },
    {
        id: 'America/Adak',
        name: 'America/Adak (HDT)',
    },
    {
        id: 'America/Anchorage',
        name: 'America/Anchorage (AKDT)',
    },
    {
        id: 'America/Anguilla',
        name: 'America/Anguilla (AST)',
    },
    {
        id: 'America/Antigua',
        name: 'America/Antigua (AST)',
    },
    {
        id: 'America/Araguaina',
        name: 'America/Araguaina (-03)',
    },
    {
        id: 'America/Argentina/Buenos_Aires',
        name: 'America/Argentina/Buenos Aires (-03)',
    },
    {
        id: 'America/Argentina/Catamarca',
        name: 'America/Argentina/Catamarca (-03)',
    },
    {
        id: 'America/Argentina/Cordoba',
        name: 'America/Argentina/Cordoba (-03)',
    },
    {
        id: 'America/Argentina/Jujuy',
        name: 'America/Argentina/Jujuy (-03)',
    },
    {
        id: 'America/Argentina/La_Rioja',
        name: 'America/Argentina/La Rioja (-03)',
    },
    {
        id: 'America/Argentina/Mendoza',
        name: 'America/Argentina/Mendoza (-03)',
    },
    {
        id: 'America/Argentina/Rio_Gallegos',
        name: 'America/Argentina/Rio Gallegos (-03)',
    },
    {
        id: 'America/Argentina/Salta',
        name: 'America/Argentina/Salta (-03)',
    },
    {
        id: 'America/Argentina/San_Juan',
        name: 'America/Argentina/San Juan (-03)',
    },
    {
        id: 'America/Argentina/San_Luis',
        name: 'America/Argentina/San Luis (-03)',
    },
    {
        id: 'America/Argentina/Tucuman',
        name: 'America/Argentina/Tucuman (-03)',
    },
    {
        id: 'America/Argentina/Ushuaia',
        name: 'America/Argentina/Ushuaia (-03)',
    },
    {
        id: 'America/Aruba',
        name: 'America/Aruba (AST)',
    },
    {
        id: 'America/Asuncion',
        name: 'America/Asuncion (-04)',
    },
    {
        id: 'America/Atikokan',
        name: 'America/Atikokan (EST)',
    },
    {
        id: 'America/Bahia',
        name: 'America/Bahia (-03)',
    },
    {
        id: 'America/Bahia_Banderas',
        name: 'America/Bahia Banderas (CDT)',
    },
    {
        id: 'America/Barbados',
        name: 'America/Barbados (AST)',
    },
    {
        id: 'America/Belem',
        name: 'America/Belem (-03)',
    },
    {
        id: 'America/Belize',
        name: 'America/Belize (CST)',
    },
    {
        id: 'America/Blanc-Sablon',
        name: 'America/Blanc-Sablon (AST)',
    },
    {
        id: 'America/Boa_Vista',
        name: 'America/Boa Vista (-04)',
    },
    {
        id: 'America/Bogota',
        name: 'America/Bogota (-05)',
    },
    {
        id: 'America/Boise',
        name: 'America/Boise (MDT)',
    },
    {
        id: 'America/Cambridge_Bay',
        name: 'America/Cambridge Bay (MDT)',
    },
    {
        id: 'America/Campo_Grande',
        name: 'America/Campo Grande (-04)',
    },
    {
        id: 'America/Cancun',
        name: 'America/Cancun (EST)',
    },
    {
        id: 'America/Caracas',
        name: 'America/Caracas (-04)',
    },
    {
        id: 'America/Cayenne',
        name: 'America/Cayenne (-03)',
    },
    {
        id: 'America/Cayman',
        name: 'America/Cayman (EST)',
    },
    {
        id: 'America/Chicago',
        name: 'America/Chicago (CDT)',
    },
    {
        id: 'America/Chihuahua',
        name: 'America/Chihuahua (MDT)',
    },
    {
        id: 'America/Costa_Rica',
        name: 'America/Costa Rica (CST)',
    },
    {
        id: 'America/Creston',
        name: 'America/Creston (MST)',
    },
    {
        id: 'America/Cuiaba',
        name: 'America/Cuiaba (-04)',
    },
    {
        id: 'America/Curacao',
        name: 'America/Curacao (AST)',
    },
    {
        id: 'America/Danmarkshavn',
        name: 'America/Danmarkshavn (GMT)',
    },
    {
        id: 'America/Dawson',
        name: 'America/Dawson (PDT)',
    },
    {
        id: 'America/Dawson_Creek',
        name: 'America/Dawson Creek (MST)',
    },
    {
        id: 'America/Denver',
        name: 'America/Denver (MDT)',
    },
    {
        id: 'America/Detroit',
        name: 'America/Detroit (EDT)',
    },
    {
        id: 'America/Dominica',
        name: 'America/Dominica (AST)',
    },
    {
        id: 'America/Edmonton',
        name: 'America/Edmonton (MDT)',
    },
    {
        id: 'America/Eirunepe',
        name: 'America/Eirunepe (-05)',
    },
    {
        id: 'America/El_Salvador',
        name: 'America/El Salvador (CST)',
    },
    {
        id: 'America/Fort_Nelson',
        name: 'America/Fort Nelson (MST)',
    },
    {
        id: 'America/Fortaleza',
        name: 'America/Fortaleza (-03)',
    },
    {
        id: 'America/Glace_Bay',
        name: 'America/Glace_Bay (ADT)',
    },
    {
        id: 'America/Godthab',
        name: 'America/Godthab (-02)',
    },
    {
        id: 'America/Goose_Bay',
        name: 'America/Goose_Bay (ADT)',
    },
    {
        id: 'America/Grand_Turk',
        name: 'America/Grand Turk (AST)',
    },
    {
        id: 'America/Grenada',
        name: 'America/Grenada (AST)',
    },
    {
        id: 'America/Guadeloupe',
        name: 'America/Guadeloupe (AST)',
    },
    {
        id: 'America/Guatemala',
        name: 'America/Guatemala (CST)',
    },
    {
        id: 'America/Guayaquil',
        name: 'America/Guayaquil (-05)',
    },
    {
        id: 'America/Guyana',
        name: 'America/Guyana (-04)',
    },
    {
        id: 'America/Halifax',
        name: 'America/Halifax (ADT)',
    },
    {
        id: 'America/Havana',
        name: 'America/Havana (CDT)',
    },
    {
        id: 'America/Hermosillo',
        name: 'America/Hermosillo (MST)',
    },
    {
        id: 'America/Indiana/Indianapolis',
        name: 'America/Indiana/Indianapolis (EDT)',
    },
    {
        id: 'America/Indiana/Knox',
        name: 'America/Indiana/Knox (CDT)',
    },
    {
        id: 'America/Indiana/Marengo',
        name: 'America/Indiana/Marengo (EDT)',
    },
    {
        id: 'America/Indiana/Petersburg',
        name: 'America/Indiana/Petersburg (EDT)',
    },
    {
        id: 'America/Indiana/Tell_City',
        name: 'America/Indiana/Tell City (CDT)',
    },
    {
        id: 'America/Indiana/Vevay',
        name: 'America/Indiana/Vevay (EDT)',
    },
    {
        id: 'America/Indiana/Vincennes',
        name: 'America/Indiana/Vincennes (EDT)',
    },
    {
        id: 'America/Indiana/Winamac',
        name: 'America/Indiana/Winamac (EDT)',
    },
    {
        id: 'America/Inuvik',
        name: 'America/Inuvik (MDT)',
    },
    {
        id: 'America/Iqaluit',
        name: 'America/Iqaluit (EDT)',
    },
    {
        id: 'America/Jamaica',
        name: 'America/Jamaica (EST)',
    },
    {
        id: 'America/Juneau',
        name: 'America/Juneau (AKDT)',
    },
    {
        id: 'America/Kentucky/Louisville',
        name: 'America/Kentucky/Louisville (EDT)',
    },
    {
        id: 'America/Kentucky/Monticello',
        name: 'America/Kentucky/Monticello (EDT)',
    },
    {
        id: 'America/Kralendijk',
        name: 'America/Kralendijk (AST)',
    },
    {
        id: 'America/La_Paz',
        name: 'America/La_Paz (-04)',
    },
    {
        id: 'America/Lima',
        name: 'America/Lima (-05)',
    },
    {
        id: 'America/Los_Angeles',
        name: 'America/Los Angeles (PDT)',
    },
    {
        id: 'America/Lower_Princes',
        name: 'America/Lower Princes (AST)',
    },
    {
        id: 'America/Maceio',
        name: 'America/Maceio (-03)',
    },
    {
        id: 'America/Managua',
        name: 'America/Managua (CST)',
    },
    {
        id: 'America/Manaus',
        name: 'America/Manaus (-04)',
    },
    {
        id: 'America/Marigot',
        name: 'America/Marigot (AST)',
    },
    {
        id: 'America/Martinique',
        name: 'America/Martinique (AST)',
    },
    {
        id: 'America/Matamoros',
        name: 'America/Matamoros (CDT)',
    },
    {
        id: 'America/Mazatlan',
        name: 'America/Mazatlan (MDT)',
    },
    {
        id: 'America/Menominee',
        name: 'America/Menominee (CDT)',
    },
    {
        id: 'America/Merida',
        name: 'America/Merida (CDT)',
    },
    {
        id: 'America/Metlakatla',
        name: 'America/Metlakatla (AKDT)',
    },
    {
        id: 'America/Mexico_City',
        name: 'America/Mexico City (CDT)',
    },
    {
        id: 'America/Miquelon',
        name: 'America/Miquelon (-02)',
    },
    {
        id: 'America/Moncton',
        name: 'America/Moncton (ADT)',
    },
    {
        id: 'America/Monterrey',
        name: 'America/Monterrey (CDT)',
    },
    {
        id: 'America/Montevideo',
        name: 'America/Montevideo (-03)',
    },
    {
        id: 'America/Montserrat',
        name: 'America/Montserrat (AST)',
    },
    {
        id: 'America/Nassau',
        name: 'America/Nassau (EDT)',
    },
    {
        id: 'America/New_York',
        name: 'America/New_York (EDT)',
    },
    {
        id: 'America/Nipigon',
        name: 'America/Nipigon (EDT)',
    },
    {
        id: 'America/Nome',
        name: 'America/Nome (AKDT)',
    },
    {
        id: 'America/Noronha',
        name: 'America/Noronha (-02)',
    },
    {
        id: 'America/North_Dakota/Beulah',
        name: 'America/North Dakota/Beulah (CDT)',
    },
    {
        id: 'America/North_Dakota/Center',
        name: 'America/North Dakota/Center (CDT)',
    },
    {
        id: 'America/North_Dakota/New_Salem',
        name: 'America/North Dakota/New Salem (CDT)',
    },
    {
        id: 'America/Ojinaga',
        name: 'America/Ojinaga (MDT)',
    },
    {
        id: 'America/Panama',
        name: 'America/Panama (EST)',
    },
    {
        id: 'America/Pangnirtung',
        name: 'America/Pangnirtung (EDT)',
    },
    {
        id: 'America/Paramaribo',
        name: 'America/Paramaribo (-03)',
    },
    {
        id: 'America/Phoenix',
        name: 'America/Phoenix (MST)',
    },
    {
        id: 'America/Port-au-Prince',
        name: 'America/Port-au-Prince (EDT)',
    },
    {
        id: 'America/Port_of_Spain',
        name: 'America/Port of Spain (AST)',
    },
    {
        id: 'America/Porto_Velho',
        name: 'America/Porto Velho (-04)',
    },
    {
        id: 'America/Puerto_Rico',
        name: 'America/Puerto Rico (AST)',
    },
    {
        id: 'America/Punta_Arenas',
        name: 'America/Punta Arenas (-03)',
    },
    {
        id: 'America/Rainy_River',
        name: 'America/Rainy River (CDT)',
    },
    {
        id: 'America/Rankin_Inlet',
        name: 'America/Rankin Inlet (CDT)',
    },
    {
        id: 'America/Recife',
        name: 'America/Recife (-03)',
    },
    {
        id: 'America/Regina',
        name: 'America/Regina (CST)',
    },
    {
        id: 'America/Resolute',
        name: 'America/Resolute (CDT)',
    },
    {
        id: 'America/Rio_Branco',
        name: 'America/Rio Branco (-05)',
    },
    {
        id: 'America/Santarem',
        name: 'America/Santarem (-03)',
    },
    {
        id: 'America/Santiago',
        name: 'America/Santiago (-04)',
    },
    {
        id: 'America/Santo_Domingo',
        name: 'America/Santo Domingo (AST)',
    },
    {
        id: 'America/Sao_Paulo',
        name: 'America/Sao Paulo (-03)',
    },
    {
        id: 'America/Scoresbysund',
        name: 'America/Scoresbysund (+00)',
    },
    {
        id: 'America/Sitka',
        name: 'America/Sitka (AKDT)',
    },
    {
        id: 'America/St_Barthelemy',
        name: 'America/St Barthelemy (AST)',
    },
    {
        id: 'America/St_Johns',
        name: 'America/St Johns (NDT)',
    },
    {
        id: 'America/St_Kitts',
        name: 'America/St Kitts (AST)',
    },
    {
        id: 'America/St_Lucia',
        name: 'America/St Lucia (AST)',
    },
    {
        id: 'America/St_Thomas',
        name: 'America/St Thomas (AST)',
    },
    {
        id: 'America/St_Vincent',
        name: 'America/St Vincent (AST)',
    },
    {
        id: 'America/Swift_Current',
        name: 'America/Swift Current (CST)',
    },
    {
        id: 'America/Tegucigalpa',
        name: 'America/Tegucigalpa (CST)',
    },
    {
        id: 'America/Thule',
        name: 'America/Thule (ADT)',
    },
    {
        id: 'America/Thunder_Bay',
        name: 'America/Thunder Bay (EDT)',
    },
    {
        id: 'America/Tijuana',
        name: 'America/Tijuana (PDT)',
    },
    {
        id: 'America/Toronto',
        name: 'America/Toronto (EDT)',
    },
    {
        id: 'America/Tortola',
        name: 'America/Tortola (AST)',
    },
    {
        id: 'America/Vancouver',
        name: 'America/Vancouver (PDT)',
    },
    {
        id: 'America/Whitehorse',
        name: 'America/Whitehorse (PDT)',
    },
    {
        id: 'America/Winnipeg',
        name: 'America/Winnipeg (CDT)',
    },
    {
        id: 'America/Yakutat',
        name: 'America/Yakutat (AKDT)',
    },
    {
        id: 'America/Yellowknife',
        name: 'America/Yellowknife (MDT)',
    },
    {
        id: 'Antarctica/Casey',
        name: 'Antarctica/Casey (+11)',
    },
    {
        id: 'Antarctica/Davis',
        name: 'Antarctica/Davis (+07)',
    },
    {
        id: 'Antarctica/DumontDUrville',
        name: 'Antarctica/DumontDUrville (+10)',
    },
    {
        id: 'Antarctica/Macquarie',
        name: 'Antarctica/Macquarie (+11)',
    },
    {
        id: 'Antarctica/Mawson',
        name: 'Antarctica/Mawson (+05)',
    },
    {
        id: 'Antarctica/McMurdo',
        name: 'Antarctica/McMurdo (NZST)',
    },
    {
        id: 'Antarctica/Palmer',
        name: 'Antarctica/Palmer (-03)',
    },
    {
        id: 'Antarctica/Rothera',
        name: 'Antarctica/Rothera (-03)',
    },
    {
        id: 'Antarctica/Syowa',
        name: 'Antarctica/Syowa (+03)',
    },
    {
        id: 'Antarctica/Troll',
        name: 'Antarctica/Troll (+02)',
    },
    {
        id: 'Antarctica/Vostok',
        name: 'Antarctica/Vostok (+06)',
    },
    {
        id: 'Arctic/Longyearbyen',
        name: 'Arctic/Longyearbyen (CEST)',
    },
    {
        id: 'Asia/Aden',
        name: 'Asia/Aden (+03)',
    },
    {
        id: 'Asia/Almaty',
        name: 'Asia/Almaty (+06)',
    },
    {
        id: 'Asia/Amman',
        name: 'Asia/Amman (EEST)',
    },
    {
        id: 'Asia/Anadyr',
        name: 'Asia/Anadyr (+12)',
    },
    {
        id: 'Asia/Aqtau',
        name: 'Asia/Aqtau (+05)',
    },
    {
        id: 'Asia/Aqtobe',
        name: 'Asia/Aqtobe (+05)',
    },
    {
        id: 'Asia/Ashgabat',
        name: 'Asia/Ashgabat (+05)',
    },
    {
        id: 'Asia/Atyrau',
        name: 'Asia/Atyrau (+05)',
    },
    {
        id: 'Asia/Baghdad',
        name: 'Asia/Baghdad (+03)',
    },
    {
        id: 'Asia/Bahrain',
        name: 'Asia/Bahrain (+03)',
    },
    {
        id: 'Asia/Baku',
        name: 'Asia/Baku (+04)',
    },
    {
        id: 'Asia/Bangkok',
        name: 'Asia/Bangkok (+07)',
    },
    {
        id: 'Asia/Barnaul',
        name: 'Asia/Barnaul (+07)',
    },
    {
        id: 'Asia/Beirut',
        name: 'Asia/Beirut (EEST)',
    },
    {
        id: 'Asia/Bishkek',
        name: 'Asia/Bishkek (+06)',
    },
    {
        id: 'Asia/Brunei',
        name: 'Asia/Brunei (+08)',
    },
    {
        id: 'Asia/Chita',
        name: 'Asia/Chita (+09)',
    },
    {
        id: 'Asia/Choibalsan',
        name: 'Asia/Choibalsan (+08)',
    },
    {
        id: 'Asia/Colombo',
        name: 'Asia/Colombo (+0530)',
    },
    {
        id: 'Asia/Damascus',
        name: 'Asia/Damascus (EEST)',
    },
    {
        id: 'Asia/Dhaka',
        name: 'Asia/Dhaka (+06)',
    },
    {
        id: 'Asia/Dili',
        name: 'Asia/Dili (+09)',
    },
    {
        id: 'Asia/Dubai',
        name: 'Asia/Dubai (+04)',
    },
    {
        id: 'Asia/Dushanbe',
        name: 'Asia/Dushanbe (+05)',
    },
    {
        id: 'Asia/Famagusta',
        name: 'Asia/Famagusta (+03)',
    },
    {
        id: 'Asia/Gaza',
        name: 'Asia/Gaza (EEST)',
    },
    {
        id: 'Asia/Hebron',
        name: 'Asia/Hebron (EEST)',
    },
    {
        id: 'Asia/Ho_Chi_Minh',
        name: 'Asia/Ho Chi Minh (+07)',
    },
    {
        id: 'Asia/Hong_Kong',
        name: 'Asia/Hong Kong (HKT)',
    },
    {
        id: 'Asia/Hovd',
        name: 'Asia/Hovd (+07)',
    },
    {
        id: 'Asia/Irkutsk',
        name: 'Asia/Irkutsk (+08)',
    },
    {
        id: 'Asia/Jakarta',
        name: 'Asia/Jakarta (WIB)',
    },
    {
        id: 'Asia/Jayapura',
        name: 'Asia/Jayapura (WIT)',
    },
    {
        id: 'Asia/Jerusalem',
        name: 'Asia/Jerusalem (IDT)',
    },
    {
        id: 'Asia/Kabul',
        name: 'Asia/Kabul (+0430)',
    },
    {
        id: 'Asia/Kamchatka',
        name: 'Asia/Kamchatka (+12)',
    },
    {
        id: 'Asia/Karachi',
        name: 'Asia/Karachi (PKT)',
    },
    {
        id: 'Asia/Kathmandu',
        name: 'Asia/Kathmandu (+0545)',
    },
    {
        id: 'Asia/Khandyga',
        name: 'Asia/Khandyga (+09)',
    },
    {
        id: 'Asia/Kolkata',
        name: 'Asia/Kolkata (IST)',
    },
    {
        id: 'Asia/Krasnoyarsk',
        name: 'Asia/Krasnoyarsk (+07)',
    },
    {
        id: 'Asia/Kuala_Lumpur',
        name: 'Asia/Kuala Lumpur (+08)',
    },
    {
        id: 'Asia/Kuching',
        name: 'Asia/Kuching (+08)',
    },
    {
        id: 'Asia/Kuwait',
        name: 'Asia/Kuwait (+03)',
    },
    {
        id: 'Asia/Macau',
        name: 'Asia/Macau (CST)',
    },
    {
        id: 'Asia/Magadan',
        name: 'Asia/Magadan (+11)',
    },
    {
        id: 'Asia/Makassar',
        name: 'Asia/Makassar (WITA)',
    },
    {
        id: 'Asia/Manila',
        name: 'Asia/Manila (+08)',
    },
    {
        id: 'Asia/Muscat',
        name: 'Asia/Muscat (+04)',
    },
    {
        id: 'Asia/Nicosia',
        name: 'Asia/Nicosia (EEST)',
    },
    {
        id: 'Asia/Novokuznetsk',
        name: 'Asia/Novokuznetsk (+07)',
    },
    {
        id: 'Asia/Novosibirsk',
        name: 'Asia/Novosibirsk (+07)',
    },
    {
        id: 'Asia/Omsk',
        name: 'Asia/Omsk (+06)',
    },
    {
        id: 'Asia/Oral',
        name: 'Asia/Oral (+05)',
    },
    {
        id: 'Asia/Phnom_Penh',
        name: 'Asia/Phnom_Penh (+07)',
    },
    {
        id: 'Asia/Pontianak',
        name: 'Asia/Pontianak (WIB)',
    },
    {
        id: 'Asia/Pyongyang',
        name: 'Asia/Pyongyang (KST)',
    },
    {
        id: 'Asia/Qatar',
        name: 'Asia/Qatar (+03)',
    },
    {
        id: 'Asia/Qyzylorda',
        name: 'Asia/Qyzylorda (+06)',
    },
    {
        id: 'Asia/Riyadh',
        name: 'Asia/Riyadh (+03)',
    },
    {
        id: 'Asia/Sakhalin',
        name: 'Asia/Sakhalin (+11)',
    },
    {
        id: 'Asia/Samarkand',
        name: 'Asia/Samarkand (+05)',
    },
    {
        id: 'Asia/Seoul',
        name: 'Asia/Seoul (KST)',
    },
    {
        id: 'Asia/Shanghai',
        name: 'Asia/Shanghai (CST)',
    },
    {
        id: 'Asia/Singapore',
        name: 'Asia/Singapore (+08)',
    },
    {
        id: 'Asia/Srednekolymsk',
        name: 'Asia/Srednekolymsk (+11)',
    },
    {
        id: 'Asia/Taipei',
        name: 'Asia/Taipei (CST)',
    },
    {
        id: 'Asia/Tashkent',
        name: 'Asia/Tashkent (+05)',
    },
    {
        id: 'Asia/Tbilisi',
        name: 'Asia/Tbilisi (+04)',
    },
    {
        id: 'Asia/Tehran',
        name: 'Asia/Tehran (+0430)',
    },
    {
        id: 'Asia/Thimphu',
        name: 'Asia/Thimphu (+06)',
    },
    {
        id: 'Asia/Tokyo',
        name: 'Asia/Tokyo (JST)',
    },
    {
        id: 'Asia/Tomsk',
        name: 'Asia/Tomsk (+07)',
    },
    {
        id: 'Asia/Ulaanbaatar',
        name: 'Asia/Ulaanbaatar (+08)',
    },
    {
        id: 'Asia/Urumqi',
        name: 'Asia/Urumqi (+06)',
    },
    {
        id: 'Asia/Ust-Nera',
        name: 'Asia/Ust-Nera (+10)',
    },
    {
        id: 'Asia/Vientiane',
        name: 'Asia/Vientiane (+07)',
    },
    {
        id: 'Asia/Vladivostok',
        name: 'Asia/Vladivostok (+10)',
    },
    {
        id: 'Asia/Yakutsk',
        name: 'Asia/Yakutsk (+09)',
    },
    {
        id: 'Asia/Yangon',
        name: 'Asia/Yangon (+0630)',
    },
    {
        id: 'Asia/Yekaterinburg',
        name: 'Asia/Yekaterinburg (+05)',
    },
    {
        id: 'Asia/Yerevan',
        name: 'Asia/Yerevan (+04)',
    },
    {
        id: 'Atlantic/Azores',
        name: 'Atlantic/Azores (+00)',
    },
    {
        id: 'Atlantic/Bermuda',
        name: 'Atlantic/Bermuda (ADT)',
    },
    {
        id: 'Atlantic/Canary',
        name: 'Atlantic/Canary (WEST)',
    },
    {
        id: 'Atlantic/Cape_Verde',
        name: 'Atlantic/Cape Verde (-01)',
    },
    {
        id: 'Atlantic/Faroe',
        name: 'Atlantic/Faroe (WEST)',
    },
    {
        id: 'Atlantic/Madeira',
        name: 'Atlantic/Madeira (WEST)',
    },
    {
        id: 'Atlantic/Reykjavik',
        name: 'Atlantic/Reykjavik (GMT)',
    },
    {
        id: 'Atlantic/South_Georgia',
        name: 'Atlantic/South Georgia (-02)',
    },
    {
        id: 'Atlantic/St_Helena',
        name: 'Atlantic/St_Helena (GMT)',
    },
    {
        id: 'Atlantic/Stanley',
        name: 'Atlantic/Stanley (-03)',
    },
    {
        id: 'Australia/Adelaide',
        name: 'Australia/Adelaide (ACST)',
    },
    {
        id: 'Australia/Brisbane',
        name: 'Australia/Brisbane (AEST)',
    },
    {
        id: 'Australia/Broken_Hill',
        name: 'Australia/Broken Hill (ACST)',
    },
    {
        id: 'Australia/Currie',
        name: 'Australia/Currie (AEST)',
    },
    {
        id: 'Australia/Darwin',
        name: 'Australia/Darwin (ACST)',
    },
    {
        id: 'Australia/Eucla',
        name: 'Australia/Eucla (+0845)',
    },
    {
        id: 'Australia/Hobart',
        name: 'Australia/Hobart (AEST)',
    },
    {
        id: 'Australia/Lindeman',
        name: 'Australia/Lindeman (AEST)',
    },
    {
        id: 'Australia/Lord_Howe',
        name: 'Australia/Lord Howe (+1030)',
    },
    {
        id: 'Australia/Melbourne',
        name: 'Australia/Melbourne (AEST)',
    },
    {
        id: 'Australia/Perth',
        name: 'Australia/Perth (AWST)',
    },
    {
        id: 'Australia/Sydney',
        name: 'Australia/Sydney (AEST)',
    },
    {
        id: 'Europe/Amsterdam',
        name: 'Europe/Amsterdam (CEST)',
    },
    {
        id: 'Europe/Andorra',
        name: 'Europe/Andorra (CEST)',
    },
    {
        id: 'Europe/Astrakhan',
        name: 'Europe/Astrakhan (+04)',
    },
    {
        id: 'Europe/Athens',
        name: 'Europe/Athens (EEST)',
    },
    {
        id: 'Europe/Belgrade',
        name: 'Europe/Belgrade (CEST)',
    },
    {
        id: 'Europe/Berlin',
        name: 'Europe/Berlin (CEST)',
    },
    {
        id: 'Europe/Bratislava',
        name: 'Europe/Bratislava (CEST)',
    },
    {
        id: 'Europe/Brussels',
        name: 'Europe/Brussels (CEST)',
    },
    {
        id: 'Europe/Bucharest',
        name: 'Europe/Bucharest (EEST)',
    },
    {
        id: 'Europe/Budapest',
        name: 'Europe/Budapest (CEST)',
    },
    {
        id: 'Europe/Busingen',
        name: 'Europe/Busingen (CEST)',
    },
    {
        id: 'Europe/Chisinau',
        name: 'Europe/Chisinau (EEST)',
    },
    {
        id: 'Europe/Copenhagen',
        name: 'Europe/Copenhagen (CEST)',
    },
    {
        id: 'Europe/Dublin',
        name: 'Europe/Dublin (IST)',
    },
    {
        id: 'Europe/Gibraltar',
        name: 'Europe/Gibraltar (CEST)',
    },
    {
        id: 'Europe/Guernsey',
        name: 'Europe/Guernsey (BST)',
    },
    {
        id: 'Europe/Helsinki',
        name: 'Europe/Helsinki (EEST)',
    },
    {
        id: 'Europe/Isle_of_Man',
        name: 'Europe/Isle of Man (BST)',
    },
    {
        id: 'Europe/Istanbul',
        name: 'Europe/Istanbul (+03)',
    },
    {
        id: 'Europe/Jersey',
        name: 'Europe/Jersey (BST)',
    },
    {
        id: 'Europe/Kaliningrad',
        name: 'Europe/Kaliningrad (EET)',
    },
    {
        id: 'Europe/Kiev',
        name: 'Europe/Kiev (EEST)',
    },
    {
        id: 'Europe/Kirov',
        name: 'Europe/Kirov (+03)',
    },
    {
        id: 'Europe/Lisbon',
        name: 'Europe/Lisbon (WEST)',
    },
    {
        id: 'Europe/Ljubljana',
        name: 'Europe/Ljubljana (CEST)',
    },
    {
        id: 'Europe/London',
        name: 'Europe/London (BST)',
    },
    {
        id: 'Europe/Luxembourg',
        name: 'Europe/Luxembourg (CEST)',
    },
    {
        id: 'Europe/Madrid',
        name: 'Europe/Madrid (CEST)',
    },
    {
        id: 'Europe/Malta',
        name: 'Europe/Malta (CEST)',
    },
    {
        id: 'Europe/Mariehamn',
        name: 'Europe/Mariehamn (EEST)',
    },
    {
        id: 'Europe/Minsk',
        name: 'Europe/Minsk (+03)',
    },
    {
        id: 'Europe/Monaco',
        name: 'Europe/Monaco (CEST)',
    },
    {
        id: 'Europe/Moscow',
        name: 'Europe/Moscow (MSK)',
    },
    {
        id: 'Europe/Oslo',
        name: 'Europe/Oslo (CEST)',
    },
    {
        id: 'Europe/Paris',
        name: 'Europe/Paris (CEST)',
    },
    {
        id: 'Europe/Podgorica',
        name: 'Europe/Podgorica (CEST)',
    },
    {
        id: 'Europe/Prague',
        name: 'Europe/Prague (CEST)',
    },
    {
        id: 'Europe/Riga',
        name: 'Europe/Riga (EEST)',
    },
    {
        id: 'Europe/Rome',
        name: 'Europe/Rome (CEST)',
    },
    {
        id: 'Europe/Samara',
        name: 'Europe/Samara (+04)',
    },
    {
        id: 'Europe/San_Marino',
        name: 'Europe/San Marino (CEST)',
    },
    {
        id: 'Europe/Sarajevo',
        name: 'Europe/Sarajevo (CEST)',
    },
    {
        id: 'Europe/Saratov',
        name: 'Europe/Saratov (+04)',
    },
    {
        id: 'Europe/Simferopol',
        name: 'Europe/Simferopol (MSK)',
    },
    {
        id: 'Europe/Skopje',
        name: 'Europe/Skopje (CEST)',
    },
    {
        id: 'Europe/Sofia',
        name: 'Europe/Sofia (EEST)',
    },
    {
        id: 'Europe/Stockholm',
        name: 'Europe/Stockholm (CEST)',
    },
    {
        id: 'Europe/Tallinn',
        name: 'Europe/Tallinn (EEST)',
    },
    {
        id: 'Europe/Tirane',
        name: 'Europe/Tirane (CEST)',
    },
    {
        id: 'Europe/Ulyanovsk',
        name: 'Europe/Ulyanovsk (+04)',
    },
    {
        id: 'Europe/Uzhgorod',
        name: 'Europe/Uzhgorod (EEST)',
    },
    {
        id: 'Europe/Vaduz',
        name: 'Europe/Vaduz (CEST)',
    },
    {
        id: 'Europe/Vatican',
        name: 'Europe/Vatican (CEST)',
    },
    {
        id: 'Europe/Vienna',
        name: 'Europe/Vienna (CEST)',
    },
    {
        id: 'Europe/Vilnius',
        name: 'Europe/Vilnius (EEST)',
    },
    {
        id: 'Europe/Volgograd',
        name: 'Europe/Volgograd (+03)',
    },
    {
        id: 'Europe/Warsaw',
        name: 'Europe/Warsaw (CEST)',
    },
    {
        id: 'Europe/Zagreb',
        name: 'Europe/Zagreb (CEST)',
    },
    {
        id: 'Europe/Zaporozhye',
        name: 'Europe/Zaporozhye (EEST)',
    },
    {
        id: 'Europe/Zurich',
        name: 'Europe/Zurich (CEST)',
    },
    {
        id: 'Indian/Antananarivo',
        name: 'Indian/Antananarivo (EAT)',
    },
    {
        id: 'Indian/Chagos',
        name: 'Indian/Chagos (+06)',
    },
    {
        id: 'Indian/Christmas',
        name: 'Indian/Christmas (+07)',
    },
    {
        id: 'Indian/Cocos',
        name: 'Indian/Cocos (+0630)',
    },
    {
        id: 'Indian/Comoro',
        name: 'Indian/Comoro (EAT)',
    },
    {
        id: 'Indian/Kerguelen',
        name: 'Indian/Kerguelen (+05)',
    },
    {
        id: 'Indian/Mahe',
        name: 'Indian/Mahe (+04)',
    },
    {
        id: 'Indian/Maldives',
        name: 'Indian/Maldives (+05)',
    },
    {
        id: 'Indian/Mauritius',
        name: 'Indian/Mauritius (+04)',
    },
    {
        id: 'Indian/Mayotte',
        name: 'Indian/Mayotte (EAT)',
    },
    {
        id: 'Indian/Reunion',
        name: 'Indian/Reunion (+04)',
    },
    {
        id: 'Pacific/Apia',
        name: 'Pacific/Apia (+13)',
    },
    {
        id: 'Pacific/Auckland',
        name: 'Pacific/Auckland (NZST)',
    },
    {
        id: 'Pacific/Bougainville',
        name: 'Pacific/Bougainville (+11)',
    },
    {
        id: 'Pacific/Chatham',
        name: 'Pacific/Chatham (+1245)',
    },
    {
        id: 'Pacific/Chuuk',
        name: 'Pacific/Chuuk (+10)',
    },
    {
        id: 'Pacific/Easter',
        name: 'Pacific/Easter (-06)',
    },
    {
        id: 'Pacific/Efate',
        name: 'Pacific/Efate (+11)',
    },
    {
        id: 'Pacific/Enderbury',
        name: 'Pacific/Enderbury (+13)',
    },
    {
        id: 'Pacific/Fakaofo',
        name: 'Pacific/Fakaofo (+13)',
    },
    {
        id: 'Pacific/Fiji',
        name: 'Pacific/Fiji (+12)',
    },
    {
        id: 'Pacific/Funafuti',
        name: 'Pacific/Funafuti (+12)',
    },
    {
        id: 'Pacific/Galapagos',
        name: 'Pacific/Galapagos (-06)',
    },
    {
        id: 'Pacific/Gambier',
        name: 'Pacific/Gambier (-09)',
    },
    {
        id: 'Pacific/Guadalcanal',
        name: 'Pacific/Guadalcanal (+11)',
    },
    {
        id: 'Pacific/Guam',
        name: 'Pacific/Guam (ChST)',
    },
    {
        id: 'Pacific/Honolulu',
        name: 'Pacific/Honolulu (HST)',
    },
    {
        id: 'Pacific/Kiritimati',
        name: 'Pacific/Kiritimati (+14)',
    },
    {
        id: 'Pacific/Kosrae',
        name: 'Pacific/Kosrae (+11)',
    },
    {
        id: 'Pacific/Kwajalein',
        name: 'Pacific/Kwajalein (+12)',
    },
    {
        id: 'Pacific/Majuro',
        name: 'Pacific/Majuro (+12)',
    },
    {
        id: 'Pacific/Marquesas',
        name: 'Pacific/Marquesas (-0930)',
    },
    {
        id: 'Pacific/Midway',
        name: 'Pacific/Midway (SST)',
    },
    {
        id: 'Pacific/Nauru',
        name: 'Pacific/Nauru (+12)',
    },
    {
        id: 'Pacific/Niue',
        name: 'Pacific/Niue (-11)',
    },
    {
        id: 'Pacific/Norfolk',
        name: 'Pacific/Norfolk (+11)',
    },
    {
        id: 'Pacific/Noumea',
        name: 'Pacific/Noumea (+11)',
    },
    {
        id: 'Pacific/Pago_Pago',
        name: 'Pacific/Pago Pago (SST)',
    },
    {
        id: 'Pacific/Palau',
        name: 'Pacific/Palau (+09)',
    },
    {
        id: 'Pacific/Pitcairn',
        name: 'Pacific/Pitcairn (-08)',
    },
    {
        id: 'Pacific/Pohnpei',
        name: 'Pacific/Pohnpei (+11)',
    },
    {
        id: 'Pacific/Port_Moresby',
        name: 'Pacific/Port Moresby (+10)',
    },
    {
        id: 'Pacific/Rarotonga',
        name: 'Pacific/Rarotonga (-10)',
    },
    {
        id: 'Pacific/Saipan',
        name: 'Pacific/Saipan (ChST)',
    },
    {
        id: 'Pacific/Tahiti',
        name: 'Pacific/Tahiti (-10)',
    },
    {
        id: 'Pacific/Tarawa',
        name: 'Pacific/Tarawa (+12)',
    },
    {
        id: 'Pacific/Tongatapu',
        name: 'Pacific/Tongatapu (+13)',
    },
    {
        id: 'Pacific/Wake',
        name: 'Pacific/Wake (+12)',
    },
    {
        id: 'Pacific/Wallis',
        name: 'Pacific/Wallis (+12)',
    },
] as IanaTimezone[];

export { IANA_TIMEZONES, type IanaTimezone };
