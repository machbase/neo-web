import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { SUBR_FORMAT_TABLE, SUBR_METHOD_TABLE, SUBR_OPTIONS_EXAMPLE_TABLE, SUBR_OPTIONS_TABLE } from './content';

export const MqttExplain = ({ pType }: { pType: string }) => {
    if (pType === 'descriptor')
        return (
            <ExtensionTab.ContentBlock>
                <ExtensionTab.ContentTitle>writing descriptor</ExtensionTab.ContentTitle>
                <ExtensionTab.ContentBlock>
                    <ExtensionTab.ContentTitle>Spec</ExtensionTab.ContentTitle>
                    <ExtensionTab.Space pHeight="16px" />
                    <ExtensionTab.ContentDesc>AutoStart</ExtensionTab.ContentDesc>
                    <ExtensionTab.ContentText pContent="makes the subscriber starts along with machbase-neo starts. Ommit this to start/stop manually."></ExtensionTab.ContentText>
                    <ExtensionTab.Space pHeight="16px" />
                    <ExtensionTab.ContentDesc>Name</ExtensionTab.ContentDesc>
                    <ExtensionTab.ContentText pContent="the name of the subscriber."></ExtensionTab.ContentText>
                    <ExtensionTab.Space pHeight="16px" />
                    <ExtensionTab.ContentDesc>Bridge</ExtensionTab.ContentDesc>
                    <ExtensionTab.ContentText pContent="the name of the bridge that the subscriber is going to use."></ExtensionTab.ContentText>
                    <ExtensionTab.Space pHeight="16px" />
                    <ExtensionTab.ContentDesc>Topic</ExtensionTab.ContentDesc>
                    <ExtensionTab.ContentText pContent="topic name to subscribe. it supports standard MQTT topic syntax includes # and +" />
                    <ExtensionTab.Space pHeight="16px" />
                    <ExtensionTab.ContentDesc>QoS</ExtensionTab.ContentDesc>
                    <ExtensionTab.ContentText pContent="subscribe to the topic QoS 1, MQTT bridges support QoS 0 and 1."></ExtensionTab.ContentText>
                    <ExtensionTab.Space pHeight="16px" />
                    <ExtensionTab.ContentDesc>Destination</ExtensionTab.ContentDesc>
                    <ExtensionTab.ContentText pContent="writing descriptor, it means the incoming data is in CSV format and writing data into the table EXAMPLE in append mode."></ExtensionTab.ContentText>
                    <ExtensionTab.CopyBlock pContent={'db/{method}/{table_name}:{format}:{compress}?{options}'} />

                    <ExtensionTab.ContentBlock>
                        {/* method */}
                        <ExtensionTab.Space pHeight="16px" />
                        <ExtensionTab.ContentDesc>Method</ExtensionTab.ContentDesc>
                        <ExtensionTab.ContentText pContent={`There are two methods append and write. The append is recommended on the stream environment like NATS.`} />
                        <div style={{ width: '400px' }}>
                            <ExtensionTab.Table pList={SUBR_METHOD_TABLE} dotted />
                        </div>
                        {/* table_name */}
                        <ExtensionTab.Space pHeight="16px" />
                        <ExtensionTab.ContentDesc>Table name</ExtensionTab.ContentDesc>
                        <ExtensionTab.ContentText pContent={`Specify the destination table name, case insensitive.`} />
                        {/* format */}
                        <ExtensionTab.Space pHeight="16px" />
                        <ExtensionTab.ContentDesc>Format</ExtensionTab.ContentDesc>
                        <div style={{ width: '150px' }}>
                            <ExtensionTab.Table pList={SUBR_FORMAT_TABLE} dotted />
                        </div>
                        {/* compress */}
                        <ExtensionTab.Space pHeight="16px" />
                        <ExtensionTab.ContentDesc>Compress</ExtensionTab.ContentDesc>
                        <ExtensionTab.ContentText pContent={`Currently gzip is supported, If :{compress} part is omitted, it means the data is not compressed.`} />
                        {/* Options */}
                        <ExtensionTab.Space pHeight="16px" />
                        <ExtensionTab.ContentDesc>Options</ExtensionTab.ContentDesc>
                        <ExtensionTab.ContentText pContent="The writing description can contain an optional question-mark-separated URL-encoded parameters." />
                        <ExtensionTab.Space pHeight="16px" />
                        <ExtensionTab.Hr />
                        <ExtensionTab.Space pHeight="12px" />
                        <ExtensionTab.Table pList={SUBR_OPTIONS_TABLE} />
                    </ExtensionTab.ContentBlock>
                </ExtensionTab.ContentBlock>
                {/* EX */}
                <ExtensionTab.ContentBlock>
                    <ExtensionTab.ContentDesc>Examples)</ExtensionTab.ContentDesc>
                    <ExtensionTab.Space pHeight="8px" />
                    <div style={{ width: '600px' }}>
                        <ExtensionTab.Table pList={SUBR_OPTIONS_EXAMPLE_TABLE} dotted />
                    </div>
                </ExtensionTab.ContentBlock>
            </ExtensionTab.ContentBlock>
        );

    if (pType === 'tql')
        return (
            <ExtensionTab.ContentBlock>
                <ExtensionTab.ContentTitle>TQL script</ExtensionTab.ContentTitle>
                <ExtensionTab.ContentDesc>The place of writing description can be replaced with a file path of TQL script.</ExtensionTab.ContentDesc>
                <ExtensionTab.Space pHeight="4px" />
                <ExtensionTab.ContentBlock>
                    <ExtensionTab.ContentTitle>Spec</ExtensionTab.ContentTitle>
                    <ExtensionTab.Space pHeight="16px" />
                    <ExtensionTab.ContentDesc>AutoStart</ExtensionTab.ContentDesc>
                    <ExtensionTab.ContentText pContent="makes the subscriber starts along with machbase-neo starts."></ExtensionTab.ContentText>
                    <ExtensionTab.Space pHeight="16px" />
                    <ExtensionTab.ContentDesc>Name</ExtensionTab.ContentDesc>
                    <ExtensionTab.ContentText pContent="the name of the subscriber"></ExtensionTab.ContentText>
                    <ExtensionTab.Space pHeight="16px" />
                    <ExtensionTab.ContentDesc>Bridge</ExtensionTab.ContentDesc>
                    <ExtensionTab.ContentText pContent="the name of the bridge that the subscriber is going to use"></ExtensionTab.ContentText>
                    <ExtensionTab.Space pHeight="16px" />
                    <ExtensionTab.ContentDesc>Topic</ExtensionTab.ContentDesc>
                    <ExtensionTab.ContentText pContent="topic name to subscribe. it supports standard MQTT topic syntax includes # and +" />
                    <ExtensionTab.Space pHeight="16px" />
                    <ExtensionTab.ContentDesc>Tql Path</ExtensionTab.ContentDesc>
                    <ExtensionTab.ContentText pContent="the tql file path which will receive the incoming data."></ExtensionTab.ContentText>
                    <ExtensionTab.Space pHeight="16px" />
                    <ExtensionTab.ContentDesc>QoS</ExtensionTab.ContentDesc>
                    <ExtensionTab.ContentText pContent="subscribe to the topic QoS 1, MQTT bridges support QoS 0 and 1."></ExtensionTab.ContentText>
                </ExtensionTab.ContentBlock>
                <ExtensionTab.ContentBlock>
                    <ExtensionTab.ContentDesc>Data writing TQL script example)</ExtensionTab.ContentDesc>
                    <ExtensionTab.CopyBlock pContent={'CSV(payload())\nMAPVALUE(1, parseTime(value(1), "ns"))\nMAPVALUE(2, parseFloat(value(2)))\nAPPEND( table("example") )'} />
                </ExtensionTab.ContentBlock>
            </ExtensionTab.ContentBlock>
        );
};
