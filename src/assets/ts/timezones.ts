import { ComboboxOption } from '@/design-system/components';

const IANA_TIMEZONES: ComboboxOption[] = [
    {
        label: 'UTC',
        value: 'UTC',
    },
    {
        label: 'LOCAL',
        value: 'LOCAL',
    },
    {
        label: 'Africa/Abidjan',
        value: 'Africa/Abidjan (GMT)',
    },
    {
        label: 'Africa/Accra',
        value: 'Africa/Accra (GMT)',
    },
    {
        label: 'Africa/Addis_Ababa',
        value: 'Africa/Addis Ababa (EAT)',
    },
    {
        label: 'Africa/Algiers',
        value: 'Africa/Algiers (CET)',
    },
    {
        label: 'Africa/Asmara',
        value: 'Africa/Asmara (EAT)',
    },
    {
        label: 'Africa/Bamako',
        value: 'Africa/Bamako (GMT)',
    },
    {
        label: 'Africa/Bangui',
        value: 'Africa/Bangui (WAT)',
    },
    {
        label: 'Africa/Banjul',
        value: 'Africa/Banjul (GMT)',
    },
    {
        label: 'Africa/Bissau',
        value: 'Africa/Bissau (GMT)',
    },
    {
        label: 'Africa/Blantyre',
        value: 'Africa/Blantyre (CAT)',
    },
    {
        label: 'Africa/Brazzaville',
        value: 'Africa/Brazzaville (WAT)',
    },
    {
        label: 'Africa/Bujumbura',
        value: 'Africa/Bujumbura (CAT)',
    },
    {
        label: 'Africa/Cairo',
        value: 'Africa/Cairo (EET)',
    },
    {
        label: 'Africa/Casablanca',
        value: 'Africa/Casablanca (WEST)',
    },
    {
        label: 'Africa/Ceuta',
        value: 'Africa/Ceuta (CEST)',
    },
    {
        label: 'Africa/Conakry',
        value: 'Africa/Conakry (GMT)',
    },
    {
        label: 'Africa/Dakar',
        value: 'Africa/Dakar (GMT)',
    },
    {
        label: 'Africa/Dar_es_Salaam',
        value: 'Africa/Dar es Salaam (EAT)',
    },
    {
        label: 'Africa/Djibouti',
        value: 'Africa/Djibouti (EAT)',
    },
    {
        label: 'Africa/Douala',
        value: 'Africa/Douala (WAT)',
    },
    {
        label: 'Africa/El_Aaiun',
        value: 'Africa/El Aaiun (WEST)',
    },
    {
        label: 'Africa/Freetown',
        value: 'Africa/Freetown (GMT)',
    },
    {
        label: 'Africa/Gaborone',
        value: 'Africa/Gaborone (CAT)',
    },
    {
        label: 'Africa/Harare',
        value: 'Africa/Harare (CAT)',
    },
    {
        label: 'Africa/Johannesburg',
        value: 'Africa/Johannesburg (SAST)',
    },
    {
        label: 'Africa/Juba',
        value: 'Africa/Juba (EAT)',
    },
    {
        label: 'Africa/Kampala',
        value: 'Africa/Kampala (EAT)',
    },
    {
        label: 'Africa/Khartoum',
        value: 'Africa/Khartoum (EAT)',
    },
    {
        label: 'Africa/Kigali',
        value: 'Africa/Kigali (CAT)',
    },
    {
        label: 'Africa/Kinshasa',
        value: 'Africa/Kinshasa (WAT)',
    },
    {
        label: 'Africa/Lagos',
        value: 'Africa/Lagos (WAT)',
    },
    {
        label: 'Africa/Libreville',
        value: 'Africa/Libreville (WAT)',
    },
    {
        label: 'Africa/Lome',
        value: 'Africa/Lome (GMT)',
    },
    {
        label: 'Africa/Luanda',
        value: 'Africa/Luanda (WAT)',
    },
    {
        label: 'Africa/Lubumbashi',
        value: 'Africa/Lubumbashi (CAT)',
    },
    {
        label: 'Africa/Lusaka',
        value: 'Africa/Lusaka (CAT)',
    },
    {
        label: 'Africa/Malabo',
        value: 'Africa/Malabo (WAT)',
    },
    {
        label: 'Africa/Maputo',
        value: 'Africa/Maputo (CAT)',
    },
    {
        label: 'Africa/Maseru',
        value: 'Africa/Maseru (SAST)',
    },
    {
        label: 'Africa/Mbabane',
        value: 'Africa/Mbabane (SAST)',
    },
    {
        label: 'Africa/Mogadishu',
        value: 'Africa/Mogadishu (EAT)',
    },
    {
        label: 'Africa/Monrovia',
        value: 'Africa/Monrovia (GMT)',
    },
    {
        label: 'Africa/Nairobi',
        value: 'Africa/Nairobi (EAT)',
    },
    {
        label: 'Africa/Ndjamena',
        value: 'Africa/Ndjamena (WAT)',
    },
    {
        label: 'Africa/Niamey',
        value: 'Africa/Niamey (WAT)',
    },
    {
        label: 'Africa/Nouakchott',
        value: 'Africa/Nouakchott (GMT)',
    },
    {
        label: 'Africa/Ouagadougou',
        value: 'Africa/Ouagadougou (GMT)',
    },
    {
        label: 'Africa/Porto-Novo',
        value: 'Africa/Porto-Novo (WAT)',
    },
    {
        label: 'Africa/Sao_Tome',
        value: 'Africa/Sao_Tome (GMT)',
    },
    {
        label: 'Africa/Tripoli',
        value: 'Africa/Tripoli (EET)',
    },
    {
        label: 'Africa/Tunis',
        value: 'Africa/Tunis (CET)',
    },
    {
        label: 'Africa/Windhoek',
        value: 'Africa/Windhoek (WAT)',
    },
    {
        label: 'America/Adak',
        value: 'America/Adak (HDT)',
    },
    {
        label: 'America/Anchorage',
        value: 'America/Anchorage (AKDT)',
    },
    {
        label: 'America/Anguilla',
        value: 'America/Anguilla (AST)',
    },
    {
        label: 'America/Antigua',
        value: 'America/Antigua (AST)',
    },
    {
        label: 'America/Araguaina',
        value: 'America/Araguaina (-03)',
    },
    {
        label: 'America/Argentina/Buenos_Aires',
        value: 'America/Argentina/Buenos Aires (-03)',
    },
    {
        label: 'America/Argentina/Catamarca',
        value: 'America/Argentina/Catamarca (-03)',
    },
    {
        label: 'America/Argentina/Cordoba',
        value: 'America/Argentina/Cordoba (-03)',
    },
    {
        label: 'America/Argentina/Jujuy',
        value: 'America/Argentina/Jujuy (-03)',
    },
    {
        label: 'America/Argentina/La_Rioja',
        value: 'America/Argentina/La Rioja (-03)',
    },
    {
        label: 'America/Argentina/Mendoza',
        value: 'America/Argentina/Mendoza (-03)',
    },
    {
        label: 'America/Argentina/Rio_Gallegos',
        value: 'America/Argentina/Rio Gallegos (-03)',
    },
    {
        label: 'America/Argentina/Salta',
        value: 'America/Argentina/Salta (-03)',
    },
    {
        label: 'America/Argentina/San_Juan',
        value: 'America/Argentina/San Juan (-03)',
    },
    {
        label: 'America/Argentina/San_Luis',
        value: 'America/Argentina/San Luis (-03)',
    },
    {
        label: 'America/Argentina/Tucuman',
        value: 'America/Argentina/Tucuman (-03)',
    },
    {
        label: 'America/Argentina/Ushuaia',
        value: 'America/Argentina/Ushuaia (-03)',
    },
    {
        label: 'America/Aruba',
        value: 'America/Aruba (AST)',
    },
    {
        label: 'America/Asuncion',
        value: 'America/Asuncion (-04)',
    },
    {
        label: 'America/Atikokan',
        value: 'America/Atikokan (EST)',
    },
    {
        label: 'America/Bahia',
        value: 'America/Bahia (-03)',
    },
    {
        label: 'America/Bahia_Banderas',
        value: 'America/Bahia Banderas (CDT)',
    },
    {
        label: 'America/Barbados',
        value: 'America/Barbados (AST)',
    },
    {
        label: 'America/Belem',
        value: 'America/Belem (-03)',
    },
    {
        label: 'America/Belize',
        value: 'America/Belize (CST)',
    },
    {
        label: 'America/Blanc-Sablon',
        value: 'America/Blanc-Sablon (AST)',
    },
    {
        label: 'America/Boa_Vista',
        value: 'America/Boa Vista (-04)',
    },
    {
        label: 'America/Bogota',
        value: 'America/Bogota (-05)',
    },
    {
        label: 'America/Boise',
        value: 'America/Boise (MDT)',
    },
    {
        label: 'America/Cambridge_Bay',
        value: 'America/Cambridge Bay (MDT)',
    },
    {
        label: 'America/Campo_Grande',
        value: 'America/Campo Grande (-04)',
    },
    {
        label: 'America/Cancun',
        value: 'America/Cancun (EST)',
    },
    {
        label: 'America/Caracas',
        value: 'America/Caracas (-04)',
    },
    {
        label: 'America/Cayenne',
        value: 'America/Cayenne (-03)',
    },
    {
        label: 'America/Cayman',
        value: 'America/Cayman (EST)',
    },
    {
        label: 'America/Chicago',
        value: 'America/Chicago (CDT)',
    },
    {
        label: 'America/Chihuahua',
        value: 'America/Chihuahua (MDT)',
    },
    {
        label: 'America/Costa_Rica',
        value: 'America/Costa Rica (CST)',
    },
    {
        label: 'America/Creston',
        value: 'America/Creston (MST)',
    },
    {
        label: 'America/Cuiaba',
        value: 'America/Cuiaba (-04)',
    },
    {
        label: 'America/Curacao',
        value: 'America/Curacao (AST)',
    },
    {
        label: 'America/Danmarkshavn',
        value: 'America/Danmarkshavn (GMT)',
    },
    {
        label: 'America/Dawson',
        value: 'America/Dawson (PDT)',
    },
    {
        label: 'America/Dawson_Creek',
        value: 'America/Dawson Creek (MST)',
    },
    {
        label: 'America/Denver',
        value: 'America/Denver (MDT)',
    },
    {
        label: 'America/Detroit',
        value: 'America/Detroit (EDT)',
    },
    {
        label: 'America/Dominica',
        value: 'America/Dominica (AST)',
    },
    {
        label: 'America/Edmonton',
        value: 'America/Edmonton (MDT)',
    },
    {
        label: 'America/Eirunepe',
        value: 'America/Eirunepe (-05)',
    },
    {
        label: 'America/El_Salvador',
        value: 'America/El Salvador (CST)',
    },
    {
        label: 'America/Fort_Nelson',
        value: 'America/Fort Nelson (MST)',
    },
    {
        label: 'America/Fortaleza',
        value: 'America/Fortaleza (-03)',
    },
    {
        label: 'America/Glace_Bay',
        value: 'America/Glace_Bay (ADT)',
    },
    {
        label: 'America/Godthab',
        value: 'America/Godthab (-02)',
    },
    {
        label: 'America/Goose_Bay',
        value: 'America/Goose_Bay (ADT)',
    },
    {
        label: 'America/Grand_Turk',
        value: 'America/Grand Turk (AST)',
    },
    {
        label: 'America/Grenada',
        value: 'America/Grenada (AST)',
    },
    {
        label: 'America/Guadeloupe',
        value: 'America/Guadeloupe (AST)',
    },
    {
        label: 'America/Guatemala',
        value: 'America/Guatemala (CST)',
    },
    {
        label: 'America/Guayaquil',
        value: 'America/Guayaquil (-05)',
    },
    {
        label: 'America/Guyana',
        value: 'America/Guyana (-04)',
    },
    {
        label: 'America/Halifax',
        value: 'America/Halifax (ADT)',
    },
    {
        label: 'America/Havana',
        value: 'America/Havana (CDT)',
    },
    {
        label: 'America/Hermosillo',
        value: 'America/Hermosillo (MST)',
    },
    {
        label: 'America/Indiana/Indianapolis',
        value: 'America/Indiana/Indianapolis (EDT)',
    },
    {
        label: 'America/Indiana/Knox',
        value: 'America/Indiana/Knox (CDT)',
    },
    {
        label: 'America/Indiana/Marengo',
        value: 'America/Indiana/Marengo (EDT)',
    },
    {
        label: 'America/Indiana/Petersburg',
        value: 'America/Indiana/Petersburg (EDT)',
    },
    {
        label: 'America/Indiana/Tell_City',
        value: 'America/Indiana/Tell City (CDT)',
    },
    {
        label: 'America/Indiana/Vevay',
        value: 'America/Indiana/Vevay (EDT)',
    },
    {
        label: 'America/Indiana/Vincennes',
        value: 'America/Indiana/Vincennes (EDT)',
    },
    {
        label: 'America/Indiana/Winamac',
        value: 'America/Indiana/Winamac (EDT)',
    },
    {
        label: 'America/Inuvik',
        value: 'America/Inuvik (MDT)',
    },
    {
        label: 'America/Iqaluit',
        value: 'America/Iqaluit (EDT)',
    },
    {
        label: 'America/Jamaica',
        value: 'America/Jamaica (EST)',
    },
    {
        label: 'America/Juneau',
        value: 'America/Juneau (AKDT)',
    },
    {
        label: 'America/Kentucky/Louisville',
        value: 'America/Kentucky/Louisville (EDT)',
    },
    {
        label: 'America/Kentucky/Monticello',
        value: 'America/Kentucky/Monticello (EDT)',
    },
    {
        label: 'America/Kralendijk',
        value: 'America/Kralendijk (AST)',
    },
    {
        label: 'America/La_Paz',
        value: 'America/La_Paz (-04)',
    },
    {
        label: 'America/Lima',
        value: 'America/Lima (-05)',
    },
    {
        label: 'America/Los_Angeles',
        value: 'America/Los Angeles (PDT)',
    },
    {
        label: 'America/Lower_Princes',
        value: 'America/Lower Princes (AST)',
    },
    {
        label: 'America/Maceio',
        value: 'America/Maceio (-03)',
    },
    {
        label: 'America/Managua',
        value: 'America/Managua (CST)',
    },
    {
        label: 'America/Manaus',
        value: 'America/Manaus (-04)',
    },
    {
        label: 'America/Marigot',
        value: 'America/Marigot (AST)',
    },
    {
        label: 'America/Martinique',
        value: 'America/Martinique (AST)',
    },
    {
        label: 'America/Matamoros',
        value: 'America/Matamoros (CDT)',
    },
    {
        label: 'America/Mazatlan',
        value: 'America/Mazatlan (MDT)',
    },
    {
        label: 'America/Menominee',
        value: 'America/Menominee (CDT)',
    },
    {
        label: 'America/Merida',
        value: 'America/Merida (CDT)',
    },
    {
        label: 'America/Metlakatla',
        value: 'America/Metlakatla (AKDT)',
    },
    {
        label: 'America/Mexico_City',
        value: 'America/Mexico City (CDT)',
    },
    {
        label: 'America/Miquelon',
        value: 'America/Miquelon (-02)',
    },
    {
        label: 'America/Moncton',
        value: 'America/Moncton (ADT)',
    },
    {
        label: 'America/Monterrey',
        value: 'America/Monterrey (CDT)',
    },
    {
        label: 'America/Montevideo',
        value: 'America/Montevideo (-03)',
    },
    {
        label: 'America/Montserrat',
        value: 'America/Montserrat (AST)',
    },
    {
        label: 'America/Nassau',
        value: 'America/Nassau (EDT)',
    },
    {
        label: 'America/New_York',
        value: 'America/New_York (EDT)',
    },
    {
        label: 'America/Nipigon',
        value: 'America/Nipigon (EDT)',
    },
    {
        label: 'America/Nome',
        value: 'America/Nome (AKDT)',
    },
    {
        label: 'America/Noronha',
        value: 'America/Noronha (-02)',
    },
    {
        label: 'America/North_Dakota/Beulah',
        value: 'America/North Dakota/Beulah (CDT)',
    },
    {
        label: 'America/North_Dakota/Center',
        value: 'America/North Dakota/Center (CDT)',
    },
    {
        label: 'America/North_Dakota/New_Salem',
        value: 'America/North Dakota/New Salem (CDT)',
    },
    {
        label: 'America/Ojinaga',
        value: 'America/Ojinaga (MDT)',
    },
    {
        label: 'America/Panama',
        value: 'America/Panama (EST)',
    },
    {
        label: 'America/Pangnirtung',
        value: 'America/Pangnirtung (EDT)',
    },
    {
        label: 'America/Paramaribo',
        value: 'America/Paramaribo (-03)',
    },
    {
        label: 'America/Phoenix',
        value: 'America/Phoenix (MST)',
    },
    {
        label: 'America/Port-au-Prince',
        value: 'America/Port-au-Prince (EDT)',
    },
    {
        label: 'America/Port_of_Spain',
        value: 'America/Port of Spain (AST)',
    },
    {
        label: 'America/Porto_Velho',
        value: 'America/Porto Velho (-04)',
    },
    {
        label: 'America/Puerto_Rico',
        value: 'America/Puerto Rico (AST)',
    },
    {
        label: 'America/Punta_Arenas',
        value: 'America/Punta Arenas (-03)',
    },
    {
        label: 'America/Rainy_River',
        value: 'America/Rainy River (CDT)',
    },
    {
        label: 'America/Rankin_Inlet',
        value: 'America/Rankin Inlet (CDT)',
    },
    {
        label: 'America/Recife',
        value: 'America/Recife (-03)',
    },
    {
        label: 'America/Regina',
        value: 'America/Regina (CST)',
    },
    {
        label: 'America/Resolute',
        value: 'America/Resolute (CDT)',
    },
    {
        label: 'America/Rio_Branco',
        value: 'America/Rio Branco (-05)',
    },
    {
        label: 'America/Santarem',
        value: 'America/Santarem (-03)',
    },
    {
        label: 'America/Santiago',
        value: 'America/Santiago (-04)',
    },
    {
        label: 'America/Santo_Domingo',
        value: 'America/Santo Domingo (AST)',
    },
    {
        label: 'America/Sao_Paulo',
        value: 'America/Sao Paulo (-03)',
    },
    {
        label: 'America/Scoresbysund',
        value: 'America/Scoresbysund (+00)',
    },
    {
        label: 'America/Sitka',
        value: 'America/Sitka (AKDT)',
    },
    {
        label: 'America/St_Barthelemy',
        value: 'America/St Barthelemy (AST)',
    },
    {
        label: 'America/St_Johns',
        value: 'America/St Johns (NDT)',
    },
    {
        label: 'America/St_Kitts',
        value: 'America/St Kitts (AST)',
    },
    {
        label: 'America/St_Lucia',
        value: 'America/St Lucia (AST)',
    },
    {
        label: 'America/St_Thomas',
        value: 'America/St Thomas (AST)',
    },
    {
        label: 'America/St_Vincent',
        value: 'America/St Vincent (AST)',
    },
    {
        label: 'America/Swift_Current',
        value: 'America/Swift Current (CST)',
    },
    {
        label: 'America/Tegucigalpa',
        value: 'America/Tegucigalpa (CST)',
    },
    {
        label: 'America/Thule',
        value: 'America/Thule (ADT)',
    },
    {
        label: 'America/Thunder_Bay',
        value: 'America/Thunder Bay (EDT)',
    },
    {
        label: 'America/Tijuana',
        value: 'America/Tijuana (PDT)',
    },
    {
        label: 'America/Toronto',
        value: 'America/Toronto (EDT)',
    },
    {
        label: 'America/Tortola',
        value: 'America/Tortola (AST)',
    },
    {
        label: 'America/Vancouver',
        value: 'America/Vancouver (PDT)',
    },
    {
        label: 'America/Whitehorse',
        value: 'America/Whitehorse (PDT)',
    },
    {
        label: 'America/Winnipeg',
        value: 'America/Winnipeg (CDT)',
    },
    {
        label: 'America/Yakutat',
        value: 'America/Yakutat (AKDT)',
    },
    {
        label: 'America/Yellowknife',
        value: 'America/Yellowknife (MDT)',
    },
    {
        label: 'Antarctica/Casey',
        value: 'Antarctica/Casey (+11)',
    },
    {
        label: 'Antarctica/Davis',
        value: 'Antarctica/Davis (+07)',
    },
    {
        label: 'Antarctica/DumontDUrville',
        value: 'Antarctica/DumontDUrville (+10)',
    },
    {
        label: 'Antarctica/Macquarie',
        value: 'Antarctica/Macquarie (+11)',
    },
    {
        label: 'Antarctica/Mawson',
        value: 'Antarctica/Mawson (+05)',
    },
    {
        label: 'Antarctica/McMurdo',
        value: 'Antarctica/McMurdo (NZST)',
    },
    {
        label: 'Antarctica/Palmer',
        value: 'Antarctica/Palmer (-03)',
    },
    {
        label: 'Antarctica/Rothera',
        value: 'Antarctica/Rothera (-03)',
    },
    {
        label: 'Antarctica/Syowa',
        value: 'Antarctica/Syowa (+03)',
    },
    {
        label: 'Antarctica/Troll',
        value: 'Antarctica/Troll (+02)',
    },
    {
        label: 'Antarctica/Vostok',
        value: 'Antarctica/Vostok (+06)',
    },
    {
        label: 'Arctic/Longyearbyen',
        value: 'Arctic/Longyearbyen (CEST)',
    },
    {
        label: 'Asia/Aden',
        value: 'Asia/Aden (+03)',
    },
    {
        label: 'Asia/Almaty',
        value: 'Asia/Almaty (+06)',
    },
    {
        label: 'Asia/Amman',
        value: 'Asia/Amman (EEST)',
    },
    {
        label: 'Asia/Anadyr',
        value: 'Asia/Anadyr (+12)',
    },
    {
        label: 'Asia/Aqtau',
        value: 'Asia/Aqtau (+05)',
    },
    {
        label: 'Asia/Aqtobe',
        value: 'Asia/Aqtobe (+05)',
    },
    {
        label: 'Asia/Ashgabat',
        value: 'Asia/Ashgabat (+05)',
    },
    {
        label: 'Asia/Atyrau',
        value: 'Asia/Atyrau (+05)',
    },
    {
        label: 'Asia/Baghdad',
        value: 'Asia/Baghdad (+03)',
    },
    {
        label: 'Asia/Bahrain',
        value: 'Asia/Bahrain (+03)',
    },
    {
        label: 'Asia/Baku',
        value: 'Asia/Baku (+04)',
    },
    {
        label: 'Asia/Bangkok',
        value: 'Asia/Bangkok (+07)',
    },
    {
        label: 'Asia/Barnaul',
        value: 'Asia/Barnaul (+07)',
    },
    {
        label: 'Asia/Beirut',
        value: 'Asia/Beirut (EEST)',
    },
    {
        label: 'Asia/Bishkek',
        value: 'Asia/Bishkek (+06)',
    },
    {
        label: 'Asia/Brunei',
        value: 'Asia/Brunei (+08)',
    },
    {
        label: 'Asia/Chita',
        value: 'Asia/Chita (+09)',
    },
    {
        label: 'Asia/Choibalsan',
        value: 'Asia/Choibalsan (+08)',
    },
    {
        label: 'Asia/Colombo',
        value: 'Asia/Colombo (+0530)',
    },
    {
        label: 'Asia/Damascus',
        value: 'Asia/Damascus (EEST)',
    },
    {
        label: 'Asia/Dhaka',
        value: 'Asia/Dhaka (+06)',
    },
    {
        label: 'Asia/Dili',
        value: 'Asia/Dili (+09)',
    },
    {
        label: 'Asia/Dubai',
        value: 'Asia/Dubai (+04)',
    },
    {
        label: 'Asia/Dushanbe',
        value: 'Asia/Dushanbe (+05)',
    },
    {
        label: 'Asia/Famagusta',
        value: 'Asia/Famagusta (+03)',
    },
    {
        label: 'Asia/Gaza',
        value: 'Asia/Gaza (EEST)',
    },
    {
        label: 'Asia/Hebron',
        value: 'Asia/Hebron (EEST)',
    },
    {
        label: 'Asia/Ho_Chi_Minh',
        value: 'Asia/Ho Chi Minh (+07)',
    },
    {
        label: 'Asia/Hong_Kong',
        value: 'Asia/Hong Kong (HKT)',
    },
    {
        label: 'Asia/Hovd',
        value: 'Asia/Hovd (+07)',
    },
    {
        label: 'Asia/Irkutsk',
        value: 'Asia/Irkutsk (+08)',
    },
    {
        label: 'Asia/Jakarta',
        value: 'Asia/Jakarta (WIB)',
    },
    {
        label: 'Asia/Jayapura',
        value: 'Asia/Jayapura (WIT)',
    },
    {
        label: 'Asia/Jerusalem',
        value: 'Asia/Jerusalem (IDT)',
    },
    {
        label: 'Asia/Kabul',
        value: 'Asia/Kabul (+0430)',
    },
    {
        label: 'Asia/Kamchatka',
        value: 'Asia/Kamchatka (+12)',
    },
    {
        label: 'Asia/Karachi',
        value: 'Asia/Karachi (PKT)',
    },
    {
        label: 'Asia/Kathmandu',
        value: 'Asia/Kathmandu (+0545)',
    },
    {
        label: 'Asia/Khandyga',
        value: 'Asia/Khandyga (+09)',
    },
    {
        label: 'Asia/Kolkata',
        value: 'Asia/Kolkata (IST)',
    },
    {
        label: 'Asia/Krasnoyarsk',
        value: 'Asia/Krasnoyarsk (+07)',
    },
    {
        label: 'Asia/Kuala_Lumpur',
        value: 'Asia/Kuala Lumpur (+08)',
    },
    {
        label: 'Asia/Kuching',
        value: 'Asia/Kuching (+08)',
    },
    {
        label: 'Asia/Kuwait',
        value: 'Asia/Kuwait (+03)',
    },
    {
        label: 'Asia/Macau',
        value: 'Asia/Macau (CST)',
    },
    {
        label: 'Asia/Magadan',
        value: 'Asia/Magadan (+11)',
    },
    {
        label: 'Asia/Makassar',
        value: 'Asia/Makassar (WITA)',
    },
    {
        label: 'Asia/Manila',
        value: 'Asia/Manila (+08)',
    },
    {
        label: 'Asia/Muscat',
        value: 'Asia/Muscat (+04)',
    },
    {
        label: 'Asia/Nicosia',
        value: 'Asia/Nicosia (EEST)',
    },
    {
        label: 'Asia/Novokuznetsk',
        value: 'Asia/Novokuznetsk (+07)',
    },
    {
        label: 'Asia/Novosibirsk',
        value: 'Asia/Novosibirsk (+07)',
    },
    {
        label: 'Asia/Omsk',
        value: 'Asia/Omsk (+06)',
    },
    {
        label: 'Asia/Oral',
        value: 'Asia/Oral (+05)',
    },
    {
        label: 'Asia/Phnom_Penh',
        value: 'Asia/Phnom_Penh (+07)',
    },
    {
        label: 'Asia/Pontianak',
        value: 'Asia/Pontianak (WIB)',
    },
    {
        label: 'Asia/Pyongyang',
        value: 'Asia/Pyongyang (KST)',
    },
    {
        label: 'Asia/Qatar',
        value: 'Asia/Qatar (+03)',
    },
    {
        label: 'Asia/Qyzylorda',
        value: 'Asia/Qyzylorda (+06)',
    },
    {
        label: 'Asia/Riyadh',
        value: 'Asia/Riyadh (+03)',
    },
    {
        label: 'Asia/Sakhalin',
        value: 'Asia/Sakhalin (+11)',
    },
    {
        label: 'Asia/Samarkand',
        value: 'Asia/Samarkand (+05)',
    },
    {
        label: 'Asia/Seoul',
        value: 'Asia/Seoul (KST)',
    },
    {
        label: 'Asia/Shanghai',
        value: 'Asia/Shanghai (CST)',
    },
    {
        label: 'Asia/Singapore',
        value: 'Asia/Singapore (+08)',
    },
    {
        label: 'Asia/Srednekolymsk',
        value: 'Asia/Srednekolymsk (+11)',
    },
    {
        label: 'Asia/Taipei',
        value: 'Asia/Taipei (CST)',
    },
    {
        label: 'Asia/Tashkent',
        value: 'Asia/Tashkent (+05)',
    },
    {
        label: 'Asia/Tbilisi',
        value: 'Asia/Tbilisi (+04)',
    },
    {
        label: 'Asia/Tehran',
        value: 'Asia/Tehran (+0430)',
    },
    {
        label: 'Asia/Thimphu',
        value: 'Asia/Thimphu (+06)',
    },
    {
        label: 'Asia/Tokyo',
        value: 'Asia/Tokyo (JST)',
    },
    {
        label: 'Asia/Tomsk',
        value: 'Asia/Tomsk (+07)',
    },
    {
        label: 'Asia/Ulaanbaatar',
        value: 'Asia/Ulaanbaatar (+08)',
    },
    {
        label: 'Asia/Urumqi',
        value: 'Asia/Urumqi (+06)',
    },
    {
        label: 'Asia/Ust-Nera',
        value: 'Asia/Ust-Nera (+10)',
    },
    {
        label: 'Asia/Vientiane',
        value: 'Asia/Vientiane (+07)',
    },
    {
        label: 'Asia/Vladivostok',
        value: 'Asia/Vladivostok (+10)',
    },
    {
        label: 'Asia/Yakutsk',
        value: 'Asia/Yakutsk (+09)',
    },
    {
        label: 'Asia/Yangon',
        value: 'Asia/Yangon (+0630)',
    },
    {
        label: 'Asia/Yekaterinburg',
        value: 'Asia/Yekaterinburg (+05)',
    },
    {
        label: 'Asia/Yerevan',
        value: 'Asia/Yerevan (+04)',
    },
    {
        label: 'Atlantic/Azores',
        value: 'Atlantic/Azores (+00)',
    },
    {
        label: 'Atlantic/Bermuda',
        value: 'Atlantic/Bermuda (ADT)',
    },
    {
        label: 'Atlantic/Canary',
        value: 'Atlantic/Canary (WEST)',
    },
    {
        label: 'Atlantic/Cape_Verde',
        value: 'Atlantic/Cape Verde (-01)',
    },
    {
        label: 'Atlantic/Faroe',
        value: 'Atlantic/Faroe (WEST)',
    },
    {
        label: 'Atlantic/Madeira',
        value: 'Atlantic/Madeira (WEST)',
    },
    {
        label: 'Atlantic/Reykjavik',
        value: 'Atlantic/Reykjavik (GMT)',
    },
    {
        label: 'Atlantic/South_Georgia',
        value: 'Atlantic/South Georgia (-02)',
    },
    {
        label: 'Atlantic/St_Helena',
        value: 'Atlantic/St_Helena (GMT)',
    },
    {
        label: 'Atlantic/Stanley',
        value: 'Atlantic/Stanley (-03)',
    },
    {
        label: 'Australia/Adelaide',
        value: 'Australia/Adelaide (ACST)',
    },
    {
        label: 'Australia/Brisbane',
        value: 'Australia/Brisbane (AEST)',
    },
    {
        label: 'Australia/Broken_Hill',
        value: 'Australia/Broken Hill (ACST)',
    },
    {
        label: 'Australia/Currie',
        value: 'Australia/Currie (AEST)',
    },
    {
        label: 'Australia/Darwin',
        value: 'Australia/Darwin (ACST)',
    },
    {
        label: 'Australia/Eucla',
        value: 'Australia/Eucla (+0845)',
    },
    {
        label: 'Australia/Hobart',
        value: 'Australia/Hobart (AEST)',
    },
    {
        label: 'Australia/Lindeman',
        value: 'Australia/Lindeman (AEST)',
    },
    {
        label: 'Australia/Lord_Howe',
        value: 'Australia/Lord Howe (+1030)',
    },
    {
        label: 'Australia/Melbourne',
        value: 'Australia/Melbourne (AEST)',
    },
    {
        label: 'Australia/Perth',
        value: 'Australia/Perth (AWST)',
    },
    {
        label: 'Australia/Sydney',
        value: 'Australia/Sydney (AEST)',
    },
    {
        label: 'Europe/Amsterdam',
        value: 'Europe/Amsterdam (CEST)',
    },
    {
        label: 'Europe/Andorra',
        value: 'Europe/Andorra (CEST)',
    },
    {
        label: 'Europe/Astrakhan',
        value: 'Europe/Astrakhan (+04)',
    },
    {
        label: 'Europe/Athens',
        value: 'Europe/Athens (EEST)',
    },
    {
        label: 'Europe/Belgrade',
        value: 'Europe/Belgrade (CEST)',
    },
    {
        label: 'Europe/Berlin',
        value: 'Europe/Berlin (CEST)',
    },
    {
        label: 'Europe/Bratislava',
        value: 'Europe/Bratislava (CEST)',
    },
    {
        label: 'Europe/Brussels',
        value: 'Europe/Brussels (CEST)',
    },
    {
        label: 'Europe/Bucharest',
        value: 'Europe/Bucharest (EEST)',
    },
    {
        label: 'Europe/Budapest',
        value: 'Europe/Budapest (CEST)',
    },
    {
        label: 'Europe/Busingen',
        value: 'Europe/Busingen (CEST)',
    },
    {
        label: 'Europe/Chisinau',
        value: 'Europe/Chisinau (EEST)',
    },
    {
        label: 'Europe/Copenhagen',
        value: 'Europe/Copenhagen (CEST)',
    },
    {
        label: 'Europe/Dublin',
        value: 'Europe/Dublin (IST)',
    },
    {
        label: 'Europe/Gibraltar',
        value: 'Europe/Gibraltar (CEST)',
    },
    {
        label: 'Europe/Guernsey',
        value: 'Europe/Guernsey (BST)',
    },
    {
        label: 'Europe/Helsinki',
        value: 'Europe/Helsinki (EEST)',
    },
    {
        label: 'Europe/Isle_of_Man',
        value: 'Europe/Isle of Man (BST)',
    },
    {
        label: 'Europe/Istanbul',
        value: 'Europe/Istanbul (+03)',
    },
    {
        label: 'Europe/Jersey',
        value: 'Europe/Jersey (BST)',
    },
    {
        label: 'Europe/Kaliningrad',
        value: 'Europe/Kaliningrad (EET)',
    },
    {
        label: 'Europe/Kiev',
        value: 'Europe/Kiev (EEST)',
    },
    {
        label: 'Europe/Kirov',
        value: 'Europe/Kirov (+03)',
    },
    {
        label: 'Europe/Lisbon',
        value: 'Europe/Lisbon (WEST)',
    },
    {
        label: 'Europe/Ljubljana',
        value: 'Europe/Ljubljana (CEST)',
    },
    {
        label: 'Europe/London',
        value: 'Europe/London (BST)',
    },
    {
        label: 'Europe/Luxembourg',
        value: 'Europe/Luxembourg (CEST)',
    },
    {
        label: 'Europe/Madrid',
        value: 'Europe/Madrid (CEST)',
    },
    {
        label: 'Europe/Malta',
        value: 'Europe/Malta (CEST)',
    },
    {
        label: 'Europe/Mariehamn',
        value: 'Europe/Mariehamn (EEST)',
    },
    {
        label: 'Europe/Minsk',
        value: 'Europe/Minsk (+03)',
    },
    {
        label: 'Europe/Monaco',
        value: 'Europe/Monaco (CEST)',
    },
    {
        label: 'Europe/Moscow',
        value: 'Europe/Moscow (MSK)',
    },
    {
        label: 'Europe/Oslo',
        value: 'Europe/Oslo (CEST)',
    },
    {
        label: 'Europe/Paris',
        value: 'Europe/Paris (CEST)',
    },
    {
        label: 'Europe/Podgorica',
        value: 'Europe/Podgorica (CEST)',
    },
    {
        label: 'Europe/Prague',
        value: 'Europe/Prague (CEST)',
    },
    {
        label: 'Europe/Riga',
        value: 'Europe/Riga (EEST)',
    },
    {
        label: 'Europe/Rome',
        value: 'Europe/Rome (CEST)',
    },
    {
        label: 'Europe/Samara',
        value: 'Europe/Samara (+04)',
    },
    {
        label: 'Europe/San_Marino',
        value: 'Europe/San Marino (CEST)',
    },
    {
        label: 'Europe/Sarajevo',
        value: 'Europe/Sarajevo (CEST)',
    },
    {
        label: 'Europe/Saratov',
        value: 'Europe/Saratov (+04)',
    },
    {
        label: 'Europe/Simferopol',
        value: 'Europe/Simferopol (MSK)',
    },
    {
        label: 'Europe/Skopje',
        value: 'Europe/Skopje (CEST)',
    },
    {
        label: 'Europe/Sofia',
        value: 'Europe/Sofia (EEST)',
    },
    {
        label: 'Europe/Stockholm',
        value: 'Europe/Stockholm (CEST)',
    },
    {
        label: 'Europe/Tallinn',
        value: 'Europe/Tallinn (EEST)',
    },
    {
        label: 'Europe/Tirane',
        value: 'Europe/Tirane (CEST)',
    },
    {
        label: 'Europe/Ulyanovsk',
        value: 'Europe/Ulyanovsk (+04)',
    },
    {
        label: 'Europe/Uzhgorod',
        value: 'Europe/Uzhgorod (EEST)',
    },
    {
        label: 'Europe/Vaduz',
        value: 'Europe/Vaduz (CEST)',
    },
    {
        label: 'Europe/Vatican',
        value: 'Europe/Vatican (CEST)',
    },
    {
        label: 'Europe/Vienna',
        value: 'Europe/Vienna (CEST)',
    },
    {
        label: 'Europe/Vilnius',
        value: 'Europe/Vilnius (EEST)',
    },
    {
        label: 'Europe/Volgograd',
        value: 'Europe/Volgograd (+03)',
    },
    {
        label: 'Europe/Warsaw',
        value: 'Europe/Warsaw (CEST)',
    },
    {
        label: 'Europe/Zagreb',
        value: 'Europe/Zagreb (CEST)',
    },
    {
        label: 'Europe/Zaporozhye',
        value: 'Europe/Zaporozhye (EEST)',
    },
    {
        label: 'Europe/Zurich',
        value: 'Europe/Zurich (CEST)',
    },
    {
        label: 'Indian/Antananarivo',
        value: 'Indian/Antananarivo (EAT)',
    },
    {
        label: 'Indian/Chagos',
        value: 'Indian/Chagos (+06)',
    },
    {
        label: 'Indian/Christmas',
        value: 'Indian/Christmas (+07)',
    },
    {
        label: 'Indian/Cocos',
        value: 'Indian/Cocos (+0630)',
    },
    {
        label: 'Indian/Comoro',
        value: 'Indian/Comoro (EAT)',
    },
    {
        label: 'Indian/Kerguelen',
        value: 'Indian/Kerguelen (+05)',
    },
    {
        label: 'Indian/Mahe',
        value: 'Indian/Mahe (+04)',
    },
    {
        label: 'Indian/Maldives',
        value: 'Indian/Maldives (+05)',
    },
    {
        label: 'Indian/Mauritius',
        value: 'Indian/Mauritius (+04)',
    },
    {
        label: 'Indian/Mayotte',
        value: 'Indian/Mayotte (EAT)',
    },
    {
        label: 'Indian/Reunion',
        value: 'Indian/Reunion (+04)',
    },
    {
        label: 'Pacific/Apia',
        value: 'Pacific/Apia (+13)',
    },
    {
        label: 'Pacific/Auckland',
        value: 'Pacific/Auckland (NZST)',
    },
    {
        label: 'Pacific/Bougainville',
        value: 'Pacific/Bougainville (+11)',
    },
    {
        label: 'Pacific/Chatham',
        value: 'Pacific/Chatham (+1245)',
    },
    {
        label: 'Pacific/Chuuk',
        value: 'Pacific/Chuuk (+10)',
    },
    {
        label: 'Pacific/Easter',
        value: 'Pacific/Easter (-06)',
    },
    {
        label: 'Pacific/Efate',
        value: 'Pacific/Efate (+11)',
    },
    {
        label: 'Pacific/Enderbury',
        value: 'Pacific/Enderbury (+13)',
    },
    {
        label: 'Pacific/Fakaofo',
        value: 'Pacific/Fakaofo (+13)',
    },
    {
        label: 'Pacific/Fiji',
        value: 'Pacific/Fiji (+12)',
    },
    {
        label: 'Pacific/Funafuti',
        value: 'Pacific/Funafuti (+12)',
    },
    {
        label: 'Pacific/Galapagos',
        value: 'Pacific/Galapagos (-06)',
    },
    {
        label: 'Pacific/Gambier',
        value: 'Pacific/Gambier (-09)',
    },
    {
        label: 'Pacific/Guadalcanal',
        value: 'Pacific/Guadalcanal (+11)',
    },
    {
        label: 'Pacific/Guam',
        value: 'Pacific/Guam (ChST)',
    },
    {
        label: 'Pacific/Honolulu',
        value: 'Pacific/Honolulu (HST)',
    },
    {
        label: 'Pacific/Kiritimati',
        value: 'Pacific/Kiritimati (+14)',
    },
    {
        label: 'Pacific/Kosrae',
        value: 'Pacific/Kosrae (+11)',
    },
    {
        label: 'Pacific/Kwajalein',
        value: 'Pacific/Kwajalein (+12)',
    },
    {
        label: 'Pacific/Majuro',
        value: 'Pacific/Majuro (+12)',
    },
    {
        label: 'Pacific/Marquesas',
        value: 'Pacific/Marquesas (-0930)',
    },
    {
        label: 'Pacific/Midway',
        value: 'Pacific/Midway (SST)',
    },
    {
        label: 'Pacific/Nauru',
        value: 'Pacific/Nauru (+12)',
    },
    {
        label: 'Pacific/Niue',
        value: 'Pacific/Niue (-11)',
    },
    {
        label: 'Pacific/Norfolk',
        value: 'Pacific/Norfolk (+11)',
    },
    {
        label: 'Pacific/Noumea',
        value: 'Pacific/Noumea (+11)',
    },
    {
        label: 'Pacific/Pago_Pago',
        value: 'Pacific/Pago Pago (SST)',
    },
    {
        label: 'Pacific/Palau',
        value: 'Pacific/Palau (+09)',
    },
    {
        label: 'Pacific/Pitcairn',
        value: 'Pacific/Pitcairn (-08)',
    },
    {
        label: 'Pacific/Pohnpei',
        value: 'Pacific/Pohnpei (+11)',
    },
    {
        label: 'Pacific/Port_Moresby',
        value: 'Pacific/Port Moresby (+10)',
    },
    {
        label: 'Pacific/Rarotonga',
        value: 'Pacific/Rarotonga (-10)',
    },
    {
        label: 'Pacific/Saipan',
        value: 'Pacific/Saipan (ChST)',
    },
    {
        label: 'Pacific/Tahiti',
        value: 'Pacific/Tahiti (-10)',
    },
    {
        label: 'Pacific/Tarawa',
        value: 'Pacific/Tarawa (+12)',
    },
    {
        label: 'Pacific/Tongatapu',
        value: 'Pacific/Tongatapu (+13)',
    },
    {
        label: 'Pacific/Wake',
        value: 'Pacific/Wake (+12)',
    },
    {
        label: 'Pacific/Wallis',
        value: 'Pacific/Wallis (+12)',
    },
];

export { IANA_TIMEZONES };
