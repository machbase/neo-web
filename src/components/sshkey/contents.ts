export const GEN_SSH_KEY = {
    title: 'Generate SSH key pair',
    desc: 'If you do not have an existing SSH key pair, generate a new one.',
    no1_title: '1. Open a terminal.',
    no2_title: `2. Type ssh-keygen -t followed by the key type and an optional comment. This comment is included in the .pub file that's created. You may want to use an email address for the comment.`,
    no2_desc_1: 'For ecdsa-sha2-nistp256:',
    no2_content_1: `ssh-keygen -t ecdsa -b 256 -C "<comment>"`,
    no2_desc_2: 'For example, for ssh-rsa:',
    no2_content_2: 'ssh-keygen -t rsa -C "<comment>"',
    no3_title: '3. Press Enter. Output similar to the following is displayed:',
    no3_content: `Generating public/private rsa key pair.\nEnter file in which to save the key (/home/user/.ssh/id_rsa):`,
    no4_title: '4. Accept the suggested filename and directory, unless you are generating a deploy key or want to save in a specific directory where you store other keys.',
    no5_title: '5. Specify a passphrase:',
    no5_content: 'Enter passphrase (empty for no passphrase):\nEnter same passphrase again:',
    no6_title: '6. A confirmation is displayed, including information about where your files are stored.',
};

export const USE_SSH_KEY = {
    title: 'Use public key authentication with SSH',
    desc: 'Adding the public key to machbase-neo server makes it possible to execute any machbase-neo shell command without prompt and entering password.',
};

export const EXEC_SSH_KEY = {
    title: 'Execute commands via SSH',
    desc: 'We can execute any machbase-neo shell command remotely only with ssh.',
    content: `ssh -p 5652 sys@127.0.0.1 'select * from example order by time desc limit 5'`,
    table: {
        columns: ['ROWNUM', 'NAME', 'TIME(UTC)', 'VALUE'],
        rows: [
            [1, 'wave.sin', '2024-06-12 11:46:46', '0.406479'],
            [2, 'wave.cos', '2024-06-12 11:46:46', '0.913660'],
            [3, 'wave.sin', '2024-06-12 11:46:45', '-0.000281'],
            [4, 'wave.cos', '2024-06-12 11:46:45', '1.000000'],
            [5, 'wave.cos', '2024-06-12 11:46:44', '0.913431'],
        ],
    },
};

export const INFO_SSH_KEY = {
    title: 'SSH keys',
    cre_alias: 'title',
    cre_title: 'public key',
    cre_desc: 'Copy the contents of your public key file.',
    cre_support: 'Only SSH keys of type "ssh-rsa" and type "ecdsa-sha2-nistp256" are supported.',
    info_title: 'Authentication keys',
    info_content: 'This is a list of SSH keys associated with your account. Remove any keys that you do not recognize.',
};
