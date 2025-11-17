import { ComboboxOption } from '@/design-system/components';

const IANA_TIMEZONES: ComboboxOption[] = [
    {
        value: 'UTC',
        label: 'UTC',
    },
    {
        value: 'LOCAL',
        label: 'LOCAL',
    },
    {
        value: 'Africa/Abidjan',
        label: 'Africa/Abidjan (GMT)',
    },
    {
        value: 'Africa/Accra',
        label: 'Africa/Accra (GMT)',
    },
    {
        value: 'Africa/Addis_Ababa',
        label: 'Africa/Addis Ababa (EAT)',
    },
    {
        value: 'Africa/Algiers',
        label: 'Africa/Algiers (CET)',
    },
    {
        value: 'Africa/Asmara',
        label: 'Africa/Asmara (EAT)',
    },
    {
        value: 'Africa/Bamako',
        label: 'Africa/Bamako (GMT)',
    },
    {
        value: 'Africa/Bangui',
        label: 'Africa/Bangui (WAT)',
    },
    {
        value: 'Africa/Banjul',
        label: 'Africa/Banjul (GMT)',
    },
    {
        value: 'Africa/Bissau',
        label: 'Africa/Bissau (GMT)',
    },
    {
        value: 'Africa/Blantyre',
        label: 'Africa/Blantyre (CAT)',
    },
    {
        value: 'Africa/Brazzaville',
        label: 'Africa/Brazzaville (WAT)',
    },
    {
        value: 'Africa/Bujumbura',
        label: 'Africa/Bujumbura (CAT)',
    },
    {
        value: 'Africa/Cairo',
        label: 'Africa/Cairo (EET)',
    },
    {
        value: 'Africa/Casablanca',
        label: 'Africa/Casablanca (WEST)',
    },
    {
        value: 'Africa/Ceuta',
        label: 'Africa/Ceuta (CEST)',
    },
    {
        value: 'Africa/Conakry',
        label: 'Africa/Conakry (GMT)',
    },
    {
        value: 'Africa/Dakar',
        label: 'Africa/Dakar (GMT)',
    },
    {
        value: 'Africa/Dar_es_Salaam',
        label: 'Africa/Dar es Salaam (EAT)',
    },
    {
        value: 'Africa/Djibouti',
        label: 'Africa/Djibouti (EAT)',
    },
    {
        value: 'Africa/Douala',
        label: 'Africa/Douala (WAT)',
    },
    {
        value: 'Africa/El_Aaiun',
        label: 'Africa/El Aaiun (WEST)',
    },
    {
        value: 'Africa/Freetown',
        label: 'Africa/Freetown (GMT)',
    },
    {
        value: 'Africa/Gaborone',
        label: 'Africa/Gaborone (CAT)',
    },
    {
        value: 'Africa/Harare',
        label: 'Africa/Harare (CAT)',
    },
    {
        value: 'Africa/Johannesburg',
        label: 'Africa/Johannesburg (SAST)',
    },
    {
        value: 'Africa/Juba',
        label: 'Africa/Juba (EAT)',
    },
    {
        value: 'Africa/Kampala',
        label: 'Africa/Kampala (EAT)',
    },
    {
        value: 'Africa/Khartoum',
        label: 'Africa/Khartoum (EAT)',
    },
    {
        value: 'Africa/Kigali',
        label: 'Africa/Kigali (CAT)',
    },
    {
        value: 'Africa/Kinshasa',
        label: 'Africa/Kinshasa (WAT)',
    },
    {
        value: 'Africa/Lagos',
        label: 'Africa/Lagos (WAT)',
    },
    {
        value: 'Africa/Libreville',
        label: 'Africa/Libreville (WAT)',
    },
    {
        value: 'Africa/Lome',
        label: 'Africa/Lome (GMT)',
    },
    {
        value: 'Africa/Luanda',
        label: 'Africa/Luanda (WAT)',
    },
    {
        value: 'Africa/Lubumbashi',
        label: 'Africa/Lubumbashi (CAT)',
    },
    {
        value: 'Africa/Lusaka',
        label: 'Africa/Lusaka (CAT)',
    },
    {
        value: 'Africa/Malabo',
        label: 'Africa/Malabo (WAT)',
    },
    {
        value: 'Africa/Maputo',
        label: 'Africa/Maputo (CAT)',
    },
    {
        value: 'Africa/Maseru',
        label: 'Africa/Maseru (SAST)',
    },
    {
        value: 'Africa/Mbabane',
        label: 'Africa/Mbabane (SAST)',
    },
    {
        value: 'Africa/Mogadishu',
        label: 'Africa/Mogadishu (EAT)',
    },
    {
        value: 'Africa/Monrovia',
        label: 'Africa/Monrovia (GMT)',
    },
    {
        value: 'Africa/Nairobi',
        label: 'Africa/Nairobi (EAT)',
    },
    {
        value: 'Africa/Ndjamena',
        label: 'Africa/Ndjamena (WAT)',
    },
    {
        value: 'Africa/Niamey',
        label: 'Africa/Niamey (WAT)',
    },
    {
        value: 'Africa/Nouakchott',
        label: 'Africa/Nouakchott (GMT)',
    },
    {
        value: 'Africa/Ouagadougou',
        label: 'Africa/Ouagadougou (GMT)',
    },
    {
        value: 'Africa/Porto-Novo',
        label: 'Africa/Porto-Novo (WAT)',
    },
    {
        value: 'Africa/Sao_Tome',
        label: 'Africa/Sao_Tome (GMT)',
    },
    {
        value: 'Africa/Tripoli',
        label: 'Africa/Tripoli (EET)',
    },
    {
        value: 'Africa/Tunis',
        label: 'Africa/Tunis (CET)',
    },
    {
        value: 'Africa/Windhoek',
        label: 'Africa/Windhoek (WAT)',
    },
    {
        value: 'America/Adak',
        label: 'America/Adak (HDT)',
    },
    {
        value: 'America/Anchorage',
        label: 'America/Anchorage (AKDT)',
    },
    {
        value: 'America/Anguilla',
        label: 'America/Anguilla (AST)',
    },
    {
        value: 'America/Antigua',
        label: 'America/Antigua (AST)',
    },
    {
        value: 'America/Araguaina',
        label: 'America/Araguaina (-03)',
    },
    {
        value: 'America/Argentina/Buenos_Aires',
        label: 'America/Argentina/Buenos Aires (-03)',
    },
    {
        value: 'America/Argentina/Catamarca',
        label: 'America/Argentina/Catamarca (-03)',
    },
    {
        value: 'America/Argentina/Cordoba',
        label: 'America/Argentina/Cordoba (-03)',
    },
    {
        value: 'America/Argentina/Jujuy',
        label: 'America/Argentina/Jujuy (-03)',
    },
    {
        value: 'America/Argentina/La_Rioja',
        label: 'America/Argentina/La Rioja (-03)',
    },
    {
        value: 'America/Argentina/Mendoza',
        label: 'America/Argentina/Mendoza (-03)',
    },
    {
        value: 'America/Argentina/Rio_Gallegos',
        label: 'America/Argentina/Rio Gallegos (-03)',
    },
    {
        value: 'America/Argentina/Salta',
        label: 'America/Argentina/Salta (-03)',
    },
    {
        value: 'America/Argentina/San_Juan',
        label: 'America/Argentina/San Juan (-03)',
    },
    {
        value: 'America/Argentina/San_Luis',
        label: 'America/Argentina/San Luis (-03)',
    },
    {
        value: 'America/Argentina/Tucuman',
        label: 'America/Argentina/Tucuman (-03)',
    },
    {
        value: 'America/Argentina/Ushuaia',
        label: 'America/Argentina/Ushuaia (-03)',
    },
    {
        value: 'America/Aruba',
        label: 'America/Aruba (AST)',
    },
    {
        value: 'America/Asuncion',
        label: 'America/Asuncion (-04)',
    },
    {
        value: 'America/Atikokan',
        label: 'America/Atikokan (EST)',
    },
    {
        value: 'America/Bahia',
        label: 'America/Bahia (-03)',
    },
    {
        value: 'America/Bahia_Banderas',
        label: 'America/Bahia Banderas (CDT)',
    },
    {
        value: 'America/Barbados',
        label: 'America/Barbados (AST)',
    },
    {
        value: 'America/Belem',
        label: 'America/Belem (-03)',
    },
    {
        value: 'America/Belize',
        label: 'America/Belize (CST)',
    },
    {
        value: 'America/Blanc-Sablon',
        label: 'America/Blanc-Sablon (AST)',
    },
    {
        value: 'America/Boa_Vista',
        label: 'America/Boa Vista (-04)',
    },
    {
        value: 'America/Bogota',
        label: 'America/Bogota (-05)',
    },
    {
        value: 'America/Boise',
        label: 'America/Boise (MDT)',
    },
    {
        value: 'America/Cambridge_Bay',
        label: 'America/Cambridge Bay (MDT)',
    },
    {
        value: 'America/Campo_Grande',
        label: 'America/Campo Grande (-04)',
    },
    {
        value: 'America/Cancun',
        label: 'America/Cancun (EST)',
    },
    {
        value: 'America/Caracas',
        label: 'America/Caracas (-04)',
    },
    {
        value: 'America/Cayenne',
        label: 'America/Cayenne (-03)',
    },
    {
        value: 'America/Cayman',
        label: 'America/Cayman (EST)',
    },
    {
        value: 'America/Chicago',
        label: 'America/Chicago (CDT)',
    },
    {
        value: 'America/Chihuahua',
        label: 'America/Chihuahua (MDT)',
    },
    {
        value: 'America/Costa_Rica',
        label: 'America/Costa Rica (CST)',
    },
    {
        value: 'America/Creston',
        label: 'America/Creston (MST)',
    },
    {
        value: 'America/Cuiaba',
        label: 'America/Cuiaba (-04)',
    },
    {
        value: 'America/Curacao',
        label: 'America/Curacao (AST)',
    },
    {
        value: 'America/Danmarkshavn',
        label: 'America/Danmarkshavn (GMT)',
    },
    {
        value: 'America/Dawson',
        label: 'America/Dawson (PDT)',
    },
    {
        value: 'America/Dawson_Creek',
        label: 'America/Dawson Creek (MST)',
    },
    {
        value: 'America/Denver',
        label: 'America/Denver (MDT)',
    },
    {
        value: 'America/Detroit',
        label: 'America/Detroit (EDT)',
    },
    {
        value: 'America/Dominica',
        label: 'America/Dominica (AST)',
    },
    {
        value: 'America/Edmonton',
        label: 'America/Edmonton (MDT)',
    },
    {
        value: 'America/Eirunepe',
        label: 'America/Eirunepe (-05)',
    },
    {
        value: 'America/El_Salvador',
        label: 'America/El Salvador (CST)',
    },
    {
        value: 'America/Fort_Nelson',
        label: 'America/Fort Nelson (MST)',
    },
    {
        value: 'America/Fortaleza',
        label: 'America/Fortaleza (-03)',
    },
    {
        value: 'America/Glace_Bay',
        label: 'America/Glace_Bay (ADT)',
    },
    {
        value: 'America/Godthab',
        label: 'America/Godthab (-02)',
    },
    {
        value: 'America/Goose_Bay',
        label: 'America/Goose_Bay (ADT)',
    },
    {
        value: 'America/Grand_Turk',
        label: 'America/Grand Turk (AST)',
    },
    {
        value: 'America/Grenada',
        label: 'America/Grenada (AST)',
    },
    {
        value: 'America/Guadeloupe',
        label: 'America/Guadeloupe (AST)',
    },
    {
        value: 'America/Guatemala',
        label: 'America/Guatemala (CST)',
    },
    {
        value: 'America/Guayaquil',
        label: 'America/Guayaquil (-05)',
    },
    {
        value: 'America/Guyana',
        label: 'America/Guyana (-04)',
    },
    {
        value: 'America/Halifax',
        label: 'America/Halifax (ADT)',
    },
    {
        value: 'America/Havana',
        label: 'America/Havana (CDT)',
    },
    {
        value: 'America/Hermosillo',
        label: 'America/Hermosillo (MST)',
    },
    {
        value: 'America/Indiana/Indianapolis',
        label: 'America/Indiana/Indianapolis (EDT)',
    },
    {
        value: 'America/Indiana/Knox',
        label: 'America/Indiana/Knox (CDT)',
    },
    {
        value: 'America/Indiana/Marengo',
        label: 'America/Indiana/Marengo (EDT)',
    },
    {
        value: 'America/Indiana/Petersburg',
        label: 'America/Indiana/Petersburg (EDT)',
    },
    {
        value: 'America/Indiana/Tell_City',
        label: 'America/Indiana/Tell City (CDT)',
    },
    {
        value: 'America/Indiana/Vevay',
        label: 'America/Indiana/Vevay (EDT)',
    },
    {
        value: 'America/Indiana/Vincennes',
        label: 'America/Indiana/Vincennes (EDT)',
    },
    {
        value: 'America/Indiana/Winamac',
        label: 'America/Indiana/Winamac (EDT)',
    },
    {
        value: 'America/Inuvik',
        label: 'America/Inuvik (MDT)',
    },
    {
        value: 'America/Iqaluit',
        label: 'America/Iqaluit (EDT)',
    },
    {
        value: 'America/Jamaica',
        label: 'America/Jamaica (EST)',
    },
    {
        value: 'America/Juneau',
        label: 'America/Juneau (AKDT)',
    },
    {
        value: 'America/Kentucky/Louisville',
        label: 'America/Kentucky/Louisville (EDT)',
    },
    {
        value: 'America/Kentucky/Monticello',
        label: 'America/Kentucky/Monticello (EDT)',
    },
    {
        value: 'America/Kralendijk',
        label: 'America/Kralendijk (AST)',
    },
    {
        value: 'America/La_Paz',
        label: 'America/La_Paz (-04)',
    },
    {
        value: 'America/Lima',
        label: 'America/Lima (-05)',
    },
    {
        value: 'America/Los_Angeles',
        label: 'America/Los Angeles (PDT)',
    },
    {
        value: 'America/Lower_Princes',
        label: 'America/Lower Princes (AST)',
    },
    {
        value: 'America/Maceio',
        label: 'America/Maceio (-03)',
    },
    {
        value: 'America/Managua',
        label: 'America/Managua (CST)',
    },
    {
        value: 'America/Manaus',
        label: 'America/Manaus (-04)',
    },
    {
        value: 'America/Marigot',
        label: 'America/Marigot (AST)',
    },
    {
        value: 'America/Martinique',
        label: 'America/Martinique (AST)',
    },
    {
        value: 'America/Matamoros',
        label: 'America/Matamoros (CDT)',
    },
    {
        value: 'America/Mazatlan',
        label: 'America/Mazatlan (MDT)',
    },
    {
        value: 'America/Menominee',
        label: 'America/Menominee (CDT)',
    },
    {
        value: 'America/Merida',
        label: 'America/Merida (CDT)',
    },
    {
        value: 'America/Metlakatla',
        label: 'America/Metlakatla (AKDT)',
    },
    {
        value: 'America/Mexico_City',
        label: 'America/Mexico City (CDT)',
    },
    {
        value: 'America/Miquelon',
        label: 'America/Miquelon (-02)',
    },
    {
        value: 'America/Moncton',
        label: 'America/Moncton (ADT)',
    },
    {
        value: 'America/Monterrey',
        label: 'America/Monterrey (CDT)',
    },
    {
        value: 'America/Montevideo',
        label: 'America/Montevideo (-03)',
    },
    {
        value: 'America/Montserrat',
        label: 'America/Montserrat (AST)',
    },
    {
        value: 'America/Nassau',
        label: 'America/Nassau (EDT)',
    },
    {
        value: 'America/New_York',
        label: 'America/New_York (EDT)',
    },
    {
        value: 'America/Nipigon',
        label: 'America/Nipigon (EDT)',
    },
    {
        value: 'America/Nome',
        label: 'America/Nome (AKDT)',
    },
    {
        value: 'America/Noronha',
        label: 'America/Noronha (-02)',
    },
    {
        value: 'America/North_Dakota/Beulah',
        label: 'America/North Dakota/Beulah (CDT)',
    },
    {
        value: 'America/North_Dakota/Center',
        label: 'America/North Dakota/Center (CDT)',
    },
    {
        value: 'America/North_Dakota/New_Salem',
        label: 'America/North Dakota/New Salem (CDT)',
    },
    {
        value: 'America/Ojinaga',
        label: 'America/Ojinaga (MDT)',
    },
    {
        value: 'America/Panama',
        label: 'America/Panama (EST)',
    },
    {
        value: 'America/Pangnirtung',
        label: 'America/Pangnirtung (EDT)',
    },
    {
        value: 'America/Paramaribo',
        label: 'America/Paramaribo (-03)',
    },
    {
        value: 'America/Phoenix',
        label: 'America/Phoenix (MST)',
    },
    {
        value: 'America/Port-au-Prince',
        label: 'America/Port-au-Prince (EDT)',
    },
    {
        value: 'America/Port_of_Spain',
        label: 'America/Port of Spain (AST)',
    },
    {
        value: 'America/Porto_Velho',
        label: 'America/Porto Velho (-04)',
    },
    {
        value: 'America/Puerto_Rico',
        label: 'America/Puerto Rico (AST)',
    },
    {
        value: 'America/Punta_Arenas',
        label: 'America/Punta Arenas (-03)',
    },
    {
        value: 'America/Rainy_River',
        label: 'America/Rainy River (CDT)',
    },
    {
        value: 'America/Rankin_Inlet',
        label: 'America/Rankin Inlet (CDT)',
    },
    {
        value: 'America/Recife',
        label: 'America/Recife (-03)',
    },
    {
        value: 'America/Regina',
        label: 'America/Regina (CST)',
    },
    {
        value: 'America/Resolute',
        label: 'America/Resolute (CDT)',
    },
    {
        value: 'America/Rio_Branco',
        label: 'America/Rio Branco (-05)',
    },
    {
        value: 'America/Santarem',
        label: 'America/Santarem (-03)',
    },
    {
        value: 'America/Santiago',
        label: 'America/Santiago (-04)',
    },
    {
        value: 'America/Santo_Domingo',
        label: 'America/Santo Domingo (AST)',
    },
    {
        value: 'America/Sao_Paulo',
        label: 'America/Sao Paulo (-03)',
    },
    {
        value: 'America/Scoresbysund',
        label: 'America/Scoresbysund (+00)',
    },
    {
        value: 'America/Sitka',
        label: 'America/Sitka (AKDT)',
    },
    {
        value: 'America/St_Barthelemy',
        label: 'America/St Barthelemy (AST)',
    },
    {
        value: 'America/St_Johns',
        label: 'America/St Johns (NDT)',
    },
    {
        value: 'America/St_Kitts',
        label: 'America/St Kitts (AST)',
    },
    {
        value: 'America/St_Lucia',
        label: 'America/St Lucia (AST)',
    },
    {
        value: 'America/St_Thomas',
        label: 'America/St Thomas (AST)',
    },
    {
        value: 'America/St_Vincent',
        label: 'America/St Vincent (AST)',
    },
    {
        value: 'America/Swift_Current',
        label: 'America/Swift Current (CST)',
    },
    {
        value: 'America/Tegucigalpa',
        label: 'America/Tegucigalpa (CST)',
    },
    {
        value: 'America/Thule',
        label: 'America/Thule (ADT)',
    },
    {
        value: 'America/Thunder_Bay',
        label: 'America/Thunder Bay (EDT)',
    },
    {
        value: 'America/Tijuana',
        label: 'America/Tijuana (PDT)',
    },
    {
        value: 'America/Toronto',
        label: 'America/Toronto (EDT)',
    },
    {
        value: 'America/Tortola',
        label: 'America/Tortola (AST)',
    },
    {
        value: 'America/Vancouver',
        label: 'America/Vancouver (PDT)',
    },
    {
        value: 'America/Whitehorse',
        label: 'America/Whitehorse (PDT)',
    },
    {
        value: 'America/Winnipeg',
        label: 'America/Winnipeg (CDT)',
    },
    {
        value: 'America/Yakutat',
        label: 'America/Yakutat (AKDT)',
    },
    {
        value: 'America/Yellowknife',
        label: 'America/Yellowknife (MDT)',
    },
    {
        value: 'Antarctica/Casey',
        label: 'Antarctica/Casey (+11)',
    },
    {
        value: 'Antarctica/Davis',
        label: 'Antarctica/Davis (+07)',
    },
    {
        value: 'Antarctica/DumontDUrville',
        label: 'Antarctica/DumontDUrville (+10)',
    },
    {
        value: 'Antarctica/Macquarie',
        label: 'Antarctica/Macquarie (+11)',
    },
    {
        value: 'Antarctica/Mawson',
        label: 'Antarctica/Mawson (+05)',
    },
    {
        value: 'Antarctica/McMurdo',
        label: 'Antarctica/McMurdo (NZST)',
    },
    {
        value: 'Antarctica/Palmer',
        label: 'Antarctica/Palmer (-03)',
    },
    {
        value: 'Antarctica/Rothera',
        label: 'Antarctica/Rothera (-03)',
    },
    {
        value: 'Antarctica/Syowa',
        label: 'Antarctica/Syowa (+03)',
    },
    {
        value: 'Antarctica/Troll',
        label: 'Antarctica/Troll (+02)',
    },
    {
        value: 'Antarctica/Vostok',
        label: 'Antarctica/Vostok (+06)',
    },
    {
        value: 'Arctic/Longyearbyen',
        label: 'Arctic/Longyearbyen (CEST)',
    },
    {
        value: 'Asia/Aden',
        label: 'Asia/Aden (+03)',
    },
    {
        value: 'Asia/Almaty',
        label: 'Asia/Almaty (+06)',
    },
    {
        value: 'Asia/Amman',
        label: 'Asia/Amman (EEST)',
    },
    {
        value: 'Asia/Anadyr',
        label: 'Asia/Anadyr (+12)',
    },
    {
        value: 'Asia/Aqtau',
        label: 'Asia/Aqtau (+05)',
    },
    {
        value: 'Asia/Aqtobe',
        label: 'Asia/Aqtobe (+05)',
    },
    {
        value: 'Asia/Ashgabat',
        label: 'Asia/Ashgabat (+05)',
    },
    {
        value: 'Asia/Atyrau',
        label: 'Asia/Atyrau (+05)',
    },
    {
        value: 'Asia/Baghdad',
        label: 'Asia/Baghdad (+03)',
    },
    {
        value: 'Asia/Bahrain',
        label: 'Asia/Bahrain (+03)',
    },
    {
        value: 'Asia/Baku',
        label: 'Asia/Baku (+04)',
    },
    {
        value: 'Asia/Bangkok',
        label: 'Asia/Bangkok (+07)',
    },
    {
        value: 'Asia/Barnaul',
        label: 'Asia/Barnaul (+07)',
    },
    {
        value: 'Asia/Beirut',
        label: 'Asia/Beirut (EEST)',
    },
    {
        value: 'Asia/Bishkek',
        label: 'Asia/Bishkek (+06)',
    },
    {
        value: 'Asia/Brunei',
        label: 'Asia/Brunei (+08)',
    },
    {
        value: 'Asia/Chita',
        label: 'Asia/Chita (+09)',
    },
    {
        value: 'Asia/Choibalsan',
        label: 'Asia/Choibalsan (+08)',
    },
    {
        value: 'Asia/Colombo',
        label: 'Asia/Colombo (+0530)',
    },
    {
        value: 'Asia/Damascus',
        label: 'Asia/Damascus (EEST)',
    },
    {
        value: 'Asia/Dhaka',
        label: 'Asia/Dhaka (+06)',
    },
    {
        value: 'Asia/Dili',
        label: 'Asia/Dili (+09)',
    },
    {
        value: 'Asia/Dubai',
        label: 'Asia/Dubai (+04)',
    },
    {
        value: 'Asia/Dushanbe',
        label: 'Asia/Dushanbe (+05)',
    },
    {
        value: 'Asia/Famagusta',
        label: 'Asia/Famagusta (+03)',
    },
    {
        value: 'Asia/Gaza',
        label: 'Asia/Gaza (EEST)',
    },
    {
        value: 'Asia/Hebron',
        label: 'Asia/Hebron (EEST)',
    },
    {
        value: 'Asia/Ho_Chi_Minh',
        label: 'Asia/Ho Chi Minh (+07)',
    },
    {
        value: 'Asia/Hong_Kong',
        label: 'Asia/Hong Kong (HKT)',
    },
    {
        value: 'Asia/Hovd',
        label: 'Asia/Hovd (+07)',
    },
    {
        value: 'Asia/Irkutsk',
        label: 'Asia/Irkutsk (+08)',
    },
    {
        value: 'Asia/Jakarta',
        label: 'Asia/Jakarta (WIB)',
    },
    {
        value: 'Asia/Jayapura',
        label: 'Asia/Jayapura (WIT)',
    },
    {
        value: 'Asia/Jerusalem',
        label: 'Asia/Jerusalem (IDT)',
    },
    {
        value: 'Asia/Kabul',
        label: 'Asia/Kabul (+0430)',
    },
    {
        value: 'Asia/Kamchatka',
        label: 'Asia/Kamchatka (+12)',
    },
    {
        value: 'Asia/Karachi',
        label: 'Asia/Karachi (PKT)',
    },
    {
        value: 'Asia/Kathmandu',
        label: 'Asia/Kathmandu (+0545)',
    },
    {
        value: 'Asia/Khandyga',
        label: 'Asia/Khandyga (+09)',
    },
    {
        value: 'Asia/Kolkata',
        label: 'Asia/Kolkata (IST)',
    },
    {
        value: 'Asia/Krasnoyarsk',
        label: 'Asia/Krasnoyarsk (+07)',
    },
    {
        value: 'Asia/Kuala_Lumpur',
        label: 'Asia/Kuala Lumpur (+08)',
    },
    {
        value: 'Asia/Kuching',
        label: 'Asia/Kuching (+08)',
    },
    {
        value: 'Asia/Kuwait',
        label: 'Asia/Kuwait (+03)',
    },
    {
        value: 'Asia/Macau',
        label: 'Asia/Macau (CST)',
    },
    {
        value: 'Asia/Magadan',
        label: 'Asia/Magadan (+11)',
    },
    {
        value: 'Asia/Makassar',
        label: 'Asia/Makassar (WITA)',
    },
    {
        value: 'Asia/Manila',
        label: 'Asia/Manila (+08)',
    },
    {
        value: 'Asia/Muscat',
        label: 'Asia/Muscat (+04)',
    },
    {
        value: 'Asia/Nicosia',
        label: 'Asia/Nicosia (EEST)',
    },
    {
        value: 'Asia/Novokuznetsk',
        label: 'Asia/Novokuznetsk (+07)',
    },
    {
        value: 'Asia/Novosibirsk',
        label: 'Asia/Novosibirsk (+07)',
    },
    {
        value: 'Asia/Omsk',
        label: 'Asia/Omsk (+06)',
    },
    {
        value: 'Asia/Oral',
        label: 'Asia/Oral (+05)',
    },
    {
        value: 'Asia/Phnom_Penh',
        label: 'Asia/Phnom_Penh (+07)',
    },
    {
        value: 'Asia/Pontianak',
        label: 'Asia/Pontianak (WIB)',
    },
    {
        value: 'Asia/Pyongyang',
        label: 'Asia/Pyongyang (KST)',
    },
    {
        value: 'Asia/Qatar',
        label: 'Asia/Qatar (+03)',
    },
    {
        value: 'Asia/Qyzylorda',
        label: 'Asia/Qyzylorda (+06)',
    },
    {
        value: 'Asia/Riyadh',
        label: 'Asia/Riyadh (+03)',
    },
    {
        value: 'Asia/Sakhalin',
        label: 'Asia/Sakhalin (+11)',
    },
    {
        value: 'Asia/Samarkand',
        label: 'Asia/Samarkand (+05)',
    },
    {
        value: 'Asia/Seoul',
        label: 'Asia/Seoul (KST)',
    },
    {
        value: 'Asia/Shanghai',
        label: 'Asia/Shanghai (CST)',
    },
    {
        value: 'Asia/Singapore',
        label: 'Asia/Singapore (+08)',
    },
    {
        value: 'Asia/Srednekolymsk',
        label: 'Asia/Srednekolymsk (+11)',
    },
    {
        value: 'Asia/Taipei',
        label: 'Asia/Taipei (CST)',
    },
    {
        value: 'Asia/Tashkent',
        label: 'Asia/Tashkent (+05)',
    },
    {
        value: 'Asia/Tbilisi',
        label: 'Asia/Tbilisi (+04)',
    },
    {
        value: 'Asia/Tehran',
        label: 'Asia/Tehran (+0430)',
    },
    {
        value: 'Asia/Thimphu',
        label: 'Asia/Thimphu (+06)',
    },
    {
        value: 'Asia/Tokyo',
        label: 'Asia/Tokyo (JST)',
    },
    {
        value: 'Asia/Tomsk',
        label: 'Asia/Tomsk (+07)',
    },
    {
        value: 'Asia/Ulaanbaatar',
        label: 'Asia/Ulaanbaatar (+08)',
    },
    {
        value: 'Asia/Urumqi',
        label: 'Asia/Urumqi (+06)',
    },
    {
        value: 'Asia/Ust-Nera',
        label: 'Asia/Ust-Nera (+10)',
    },
    {
        value: 'Asia/Vientiane',
        label: 'Asia/Vientiane (+07)',
    },
    {
        value: 'Asia/Vladivostok',
        label: 'Asia/Vladivostok (+10)',
    },
    {
        value: 'Asia/Yakutsk',
        label: 'Asia/Yakutsk (+09)',
    },
    {
        value: 'Asia/Yangon',
        label: 'Asia/Yangon (+0630)',
    },
    {
        value: 'Asia/Yekaterinburg',
        label: 'Asia/Yekaterinburg (+05)',
    },
    {
        value: 'Asia/Yerevan',
        label: 'Asia/Yerevan (+04)',
    },
    {
        value: 'Atlantic/Azores',
        label: 'Atlantic/Azores (+00)',
    },
    {
        value: 'Atlantic/Bermuda',
        label: 'Atlantic/Bermuda (ADT)',
    },
    {
        value: 'Atlantic/Canary',
        label: 'Atlantic/Canary (WEST)',
    },
    {
        value: 'Atlantic/Cape_Verde',
        label: 'Atlantic/Cape Verde (-01)',
    },
    {
        value: 'Atlantic/Faroe',
        label: 'Atlantic/Faroe (WEST)',
    },
    {
        value: 'Atlantic/Madeira',
        label: 'Atlantic/Madeira (WEST)',
    },
    {
        value: 'Atlantic/Reykjavik',
        label: 'Atlantic/Reykjavik (GMT)',
    },
    {
        value: 'Atlantic/South_Georgia',
        label: 'Atlantic/South Georgia (-02)',
    },
    {
        value: 'Atlantic/St_Helena',
        label: 'Atlantic/St_Helena (GMT)',
    },
    {
        value: 'Atlantic/Stanley',
        label: 'Atlantic/Stanley (-03)',
    },
    {
        value: 'Australia/Adelaide',
        label: 'Australia/Adelaide (ACST)',
    },
    {
        value: 'Australia/Brisbane',
        label: 'Australia/Brisbane (AEST)',
    },
    {
        value: 'Australia/Broken_Hill',
        label: 'Australia/Broken Hill (ACST)',
    },
    {
        value: 'Australia/Currie',
        label: 'Australia/Currie (AEST)',
    },
    {
        value: 'Australia/Darwin',
        label: 'Australia/Darwin (ACST)',
    },
    {
        value: 'Australia/Eucla',
        label: 'Australia/Eucla (+0845)',
    },
    {
        value: 'Australia/Hobart',
        label: 'Australia/Hobart (AEST)',
    },
    {
        value: 'Australia/Lindeman',
        label: 'Australia/Lindeman (AEST)',
    },
    {
        value: 'Australia/Lord_Howe',
        label: 'Australia/Lord Howe (+1030)',
    },
    {
        value: 'Australia/Melbourne',
        label: 'Australia/Melbourne (AEST)',
    },
    {
        value: 'Australia/Perth',
        label: 'Australia/Perth (AWST)',
    },
    {
        value: 'Australia/Sydney',
        label: 'Australia/Sydney (AEST)',
    },
    {
        value: 'Europe/Amsterdam',
        label: 'Europe/Amsterdam (CEST)',
    },
    {
        value: 'Europe/Andorra',
        label: 'Europe/Andorra (CEST)',
    },
    {
        value: 'Europe/Astrakhan',
        label: 'Europe/Astrakhan (+04)',
    },
    {
        value: 'Europe/Athens',
        label: 'Europe/Athens (EEST)',
    },
    {
        value: 'Europe/Belgrade',
        label: 'Europe/Belgrade (CEST)',
    },
    {
        value: 'Europe/Berlin',
        label: 'Europe/Berlin (CEST)',
    },
    {
        value: 'Europe/Bratislava',
        label: 'Europe/Bratislava (CEST)',
    },
    {
        value: 'Europe/Brussels',
        label: 'Europe/Brussels (CEST)',
    },
    {
        value: 'Europe/Bucharest',
        label: 'Europe/Bucharest (EEST)',
    },
    {
        value: 'Europe/Budapest',
        label: 'Europe/Budapest (CEST)',
    },
    {
        value: 'Europe/Busingen',
        label: 'Europe/Busingen (CEST)',
    },
    {
        value: 'Europe/Chisinau',
        label: 'Europe/Chisinau (EEST)',
    },
    {
        value: 'Europe/Copenhagen',
        label: 'Europe/Copenhagen (CEST)',
    },
    {
        value: 'Europe/Dublin',
        label: 'Europe/Dublin (IST)',
    },
    {
        value: 'Europe/Gibraltar',
        label: 'Europe/Gibraltar (CEST)',
    },
    {
        value: 'Europe/Guernsey',
        label: 'Europe/Guernsey (BST)',
    },
    {
        value: 'Europe/Helsinki',
        label: 'Europe/Helsinki (EEST)',
    },
    {
        value: 'Europe/Isle_of_Man',
        label: 'Europe/Isle of Man (BST)',
    },
    {
        value: 'Europe/Istanbul',
        label: 'Europe/Istanbul (+03)',
    },
    {
        value: 'Europe/Jersey',
        label: 'Europe/Jersey (BST)',
    },
    {
        value: 'Europe/Kaliningrad',
        label: 'Europe/Kaliningrad (EET)',
    },
    {
        value: 'Europe/Kiev',
        label: 'Europe/Kiev (EEST)',
    },
    {
        value: 'Europe/Kirov',
        label: 'Europe/Kirov (+03)',
    },
    {
        value: 'Europe/Lisbon',
        label: 'Europe/Lisbon (WEST)',
    },
    {
        value: 'Europe/Ljubljana',
        label: 'Europe/Ljubljana (CEST)',
    },
    {
        value: 'Europe/London',
        label: 'Europe/London (BST)',
    },
    {
        value: 'Europe/Luxembourg',
        label: 'Europe/Luxembourg (CEST)',
    },
    {
        value: 'Europe/Madrid',
        label: 'Europe/Madrid (CEST)',
    },
    {
        value: 'Europe/Malta',
        label: 'Europe/Malta (CEST)',
    },
    {
        value: 'Europe/Mariehamn',
        label: 'Europe/Mariehamn (EEST)',
    },
    {
        value: 'Europe/Minsk',
        label: 'Europe/Minsk (+03)',
    },
    {
        value: 'Europe/Monaco',
        label: 'Europe/Monaco (CEST)',
    },
    {
        value: 'Europe/Moscow',
        label: 'Europe/Moscow (MSK)',
    },
    {
        value: 'Europe/Oslo',
        label: 'Europe/Oslo (CEST)',
    },
    {
        value: 'Europe/Paris',
        label: 'Europe/Paris (CEST)',
    },
    {
        value: 'Europe/Podgorica',
        label: 'Europe/Podgorica (CEST)',
    },
    {
        value: 'Europe/Prague',
        label: 'Europe/Prague (CEST)',
    },
    {
        value: 'Europe/Riga',
        label: 'Europe/Riga (EEST)',
    },
    {
        value: 'Europe/Rome',
        label: 'Europe/Rome (CEST)',
    },
    {
        value: 'Europe/Samara',
        label: 'Europe/Samara (+04)',
    },
    {
        value: 'Europe/San_Marino',
        label: 'Europe/San Marino (CEST)',
    },
    {
        value: 'Europe/Sarajevo',
        label: 'Europe/Sarajevo (CEST)',
    },
    {
        value: 'Europe/Saratov',
        label: 'Europe/Saratov (+04)',
    },
    {
        value: 'Europe/Simferopol',
        label: 'Europe/Simferopol (MSK)',
    },
    {
        value: 'Europe/Skopje',
        label: 'Europe/Skopje (CEST)',
    },
    {
        value: 'Europe/Sofia',
        label: 'Europe/Sofia (EEST)',
    },
    {
        value: 'Europe/Stockholm',
        label: 'Europe/Stockholm (CEST)',
    },
    {
        value: 'Europe/Tallinn',
        label: 'Europe/Tallinn (EEST)',
    },
    {
        value: 'Europe/Tirane',
        label: 'Europe/Tirane (CEST)',
    },
    {
        value: 'Europe/Ulyanovsk',
        label: 'Europe/Ulyanovsk (+04)',
    },
    {
        value: 'Europe/Uzhgorod',
        label: 'Europe/Uzhgorod (EEST)',
    },
    {
        value: 'Europe/Vaduz',
        label: 'Europe/Vaduz (CEST)',
    },
    {
        value: 'Europe/Vatican',
        label: 'Europe/Vatican (CEST)',
    },
    {
        value: 'Europe/Vienna',
        label: 'Europe/Vienna (CEST)',
    },
    {
        value: 'Europe/Vilnius',
        label: 'Europe/Vilnius (EEST)',
    },
    {
        value: 'Europe/Volgograd',
        label: 'Europe/Volgograd (+03)',
    },
    {
        value: 'Europe/Warsaw',
        label: 'Europe/Warsaw (CEST)',
    },
    {
        value: 'Europe/Zagreb',
        label: 'Europe/Zagreb (CEST)',
    },
    {
        value: 'Europe/Zaporozhye',
        label: 'Europe/Zaporozhye (EEST)',
    },
    {
        value: 'Europe/Zurich',
        label: 'Europe/Zurich (CEST)',
    },
    {
        value: 'Indian/Antananarivo',
        label: 'Indian/Antananarivo (EAT)',
    },
    {
        value: 'Indian/Chagos',
        label: 'Indian/Chagos (+06)',
    },
    {
        value: 'Indian/Christmas',
        label: 'Indian/Christmas (+07)',
    },
    {
        value: 'Indian/Cocos',
        label: 'Indian/Cocos (+0630)',
    },
    {
        value: 'Indian/Comoro',
        label: 'Indian/Comoro (EAT)',
    },
    {
        value: 'Indian/Kerguelen',
        label: 'Indian/Kerguelen (+05)',
    },
    {
        value: 'Indian/Mahe',
        label: 'Indian/Mahe (+04)',
    },
    {
        value: 'Indian/Maldives',
        label: 'Indian/Maldives (+05)',
    },
    {
        value: 'Indian/Mauritius',
        label: 'Indian/Mauritius (+04)',
    },
    {
        value: 'Indian/Mayotte',
        label: 'Indian/Mayotte (EAT)',
    },
    {
        value: 'Indian/Reunion',
        label: 'Indian/Reunion (+04)',
    },
    {
        value: 'Pacific/Apia',
        label: 'Pacific/Apia (+13)',
    },
    {
        value: 'Pacific/Auckland',
        label: 'Pacific/Auckland (NZST)',
    },
    {
        value: 'Pacific/Bougainville',
        label: 'Pacific/Bougainville (+11)',
    },
    {
        value: 'Pacific/Chatham',
        label: 'Pacific/Chatham (+1245)',
    },
    {
        value: 'Pacific/Chuuk',
        label: 'Pacific/Chuuk (+10)',
    },
    {
        value: 'Pacific/Easter',
        label: 'Pacific/Easter (-06)',
    },
    {
        value: 'Pacific/Efate',
        label: 'Pacific/Efate (+11)',
    },
    {
        value: 'Pacific/Enderbury',
        label: 'Pacific/Enderbury (+13)',
    },
    {
        value: 'Pacific/Fakaofo',
        label: 'Pacific/Fakaofo (+13)',
    },
    {
        value: 'Pacific/Fiji',
        label: 'Pacific/Fiji (+12)',
    },
    {
        value: 'Pacific/Funafuti',
        label: 'Pacific/Funafuti (+12)',
    },
    {
        value: 'Pacific/Galapagos',
        label: 'Pacific/Galapagos (-06)',
    },
    {
        value: 'Pacific/Gambier',
        label: 'Pacific/Gambier (-09)',
    },
    {
        value: 'Pacific/Guadalcanal',
        label: 'Pacific/Guadalcanal (+11)',
    },
    {
        value: 'Pacific/Guam',
        label: 'Pacific/Guam (ChST)',
    },
    {
        value: 'Pacific/Honolulu',
        label: 'Pacific/Honolulu (HST)',
    },
    {
        value: 'Pacific/Kiritimati',
        label: 'Pacific/Kiritimati (+14)',
    },
    {
        value: 'Pacific/Kosrae',
        label: 'Pacific/Kosrae (+11)',
    },
    {
        value: 'Pacific/Kwajalein',
        label: 'Pacific/Kwajalein (+12)',
    },
    {
        value: 'Pacific/Majuro',
        label: 'Pacific/Majuro (+12)',
    },
    {
        value: 'Pacific/Marquesas',
        label: 'Pacific/Marquesas (-0930)',
    },
    {
        value: 'Pacific/Midway',
        label: 'Pacific/Midway (SST)',
    },
    {
        value: 'Pacific/Nauru',
        label: 'Pacific/Nauru (+12)',
    },
    {
        value: 'Pacific/Niue',
        label: 'Pacific/Niue (-11)',
    },
    {
        value: 'Pacific/Norfolk',
        label: 'Pacific/Norfolk (+11)',
    },
    {
        value: 'Pacific/Noumea',
        label: 'Pacific/Noumea (+11)',
    },
    {
        value: 'Pacific/Pago_Pago',
        label: 'Pacific/Pago Pago (SST)',
    },
    {
        value: 'Pacific/Palau',
        label: 'Pacific/Palau (+09)',
    },
    {
        value: 'Pacific/Pitcairn',
        label: 'Pacific/Pitcairn (-08)',
    },
    {
        value: 'Pacific/Pohnpei',
        label: 'Pacific/Pohnpei (+11)',
    },
    {
        value: 'Pacific/Port_Moresby',
        label: 'Pacific/Port Moresby (+10)',
    },
    {
        value: 'Pacific/Rarotonga',
        label: 'Pacific/Rarotonga (-10)',
    },
    {
        value: 'Pacific/Saipan',
        label: 'Pacific/Saipan (ChST)',
    },
    {
        value: 'Pacific/Tahiti',
        label: 'Pacific/Tahiti (-10)',
    },
    {
        value: 'Pacific/Tarawa',
        label: 'Pacific/Tarawa (+12)',
    },
    {
        value: 'Pacific/Tongatapu',
        label: 'Pacific/Tongatapu (+13)',
    },
    {
        value: 'Pacific/Wake',
        label: 'Pacific/Wake (+12)',
    },
    {
        value: 'Pacific/Wallis',
        label: 'Pacific/Wallis (+12)',
    },
];

export { IANA_TIMEZONES };
