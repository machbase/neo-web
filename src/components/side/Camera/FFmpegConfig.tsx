import { Badge, Dropdown, Input, Page, TextHighlight } from '@/design-system/components';

// RTSP Transport options
const RTSP_TRANSPORT_OPTIONS = [
    { label: 'TCP', value: 'tcp' },
    { label: 'UDP', value: 'udp' },
    { label: 'UDP Multicast', value: 'udp_multicast' },
    { label: 'HTTP', value: 'http' },
];

// RTSP Flags options
const RTSP_FLAGS_OPTIONS = [
    { label: 'Prefer TCP', value: 'prefer_tcp' },
    { label: 'Filter Source', value: 'filter_src' },
    { label: 'Listen', value: 'listen' },
    { label: 'LATM', value: 'latm' },
    { label: 'RFC2190', value: 'rfc2190' },
    { label: 'Skip RTCP', value: 'skip_rtcp' },
];

// Log level options
// const LOG_LEVEL_OPTIONS = [
//     { label: 'Quiet', value: 'quiet' },
//     { label: 'Panic', value: 'panic' },
//     { label: 'Fatal', value: 'fatal' },
//     { label: 'Error', value: 'error' },
//     { label: 'Warning', value: 'warning' },
//     { label: 'Info', value: 'info' },
//     { label: 'Verbose', value: 'verbose' },
//     { label: 'Debug', value: 'debug' },
//     { label: 'Trace', value: 'trace' },
// ];

// Video codec options
// const VIDEO_CODEC_OPTIONS = [
//     { label: 'H.264 (libx264)', value: 'libx264' },
//     { label: 'H.265 (libx265)', value: 'libx265' },
//     { label: 'VP8 (libvpx)', value: 'libvpx' },
//     { label: 'VP9 (libvpx-vp9)', value: 'libvpx-vp9' },
//     { label: 'AV1 (libaom-av1)', value: 'libaom-av1' },
//     { label: 'Copy (no re-encoding)', value: 'copy' },
// ];

// Hardware acceleration options
// const HW_ACCEL_OPTIONS = [
//     { label: 'None (Software)', value: 'none' },
//     { label: 'NVIDIA NVENC', value: 'nvenc' },
//     { label: 'Intel QSV', value: 'qsv' },
//     { label: 'AMD AMF', value: 'amf' },
//     { label: 'VAAPI (Linux)', value: 'vaapi' },
//     { label: 'VideoToolbox (macOS)', value: 'videotoolbox' },
// ];

// Default values
export const FFMPEG_DEFAULT_CONFIG: FFmpegConfigType = {
    // Input & Network settings (RTSP/Network)
    rtspTransport: 'tcp',
    rtspFlags: 'prefer_tcp',
    bufferSize: 10485760,
    maxDelay: 5000000,
    probesize: 10000000,
    analyzeduration: 10000000,
    // Output & DASH settings (Output/Muxer)
    segDuration: 5,
    useTemplate: true,
    useTimeline: true,
    // Encoding settings
    videoCodec: 'copy',
    // logLevel: 'error',
    // hwAccel: 'none',
};

export interface FFmpegConfigType {
    // Input & Network settings
    rtspTransport: string;
    rtspFlags: string;
    bufferSize: number;
    maxDelay: number;
    probesize: number;
    analyzeduration: number;
    // Output & DASH settings
    segDuration: number;
    useTemplate: boolean;
    useTimeline: boolean;
    // Encoding settings
    videoCodec: string; // hidden
    // logLevel: string;
    // hwAccel: string;
}

export interface FFmpegConfigProps {
    value?: FFmpegConfigType;
    onChange?: (config: FFmpegConfigType) => void;
    readOnly?: boolean;
}

export const FFmpegConfig = ({ value = FFMPEG_DEFAULT_CONFIG, onChange, readOnly = false }: FFmpegConfigProps) => {
    const handleChange = (key: keyof FFmpegConfigType, newValue: string | number | boolean) => {
        if (onChange) {
            onChange({ ...value, [key]: newValue });
        }
    };

    return (
        <Page.ContentBlock pHoverNone style={{ margin: 0 }}>
            <Page.DpRow style={{ textWrap: 'nowrap', gap: '20px' }}>
                <Page.ContentTitle>FFmpeg configuration</Page.ContentTitle>
                <Page.Divi direction="horizontal" />
            </Page.DpRow>
            <Page.Space />
            <Page.ContentBlock pHoverNone style={{ border: 'solid 0.5px #454545', borderRadius: '4px', flexDirection: 'column' }}>
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    {/* Input & Network Settings */}
                    <Page.ContentDesc>
                        <TextHighlight variant="primary">Input & Network Settings</TextHighlight>
                    </Page.ContentDesc>
                    <Page.Space />
                    <Page.DpRow style={{ gap: '20px' }}>
                        <Dropdown.Root
                            label="RTSP Transport"
                            fullWidth
                            options={RTSP_TRANSPORT_OPTIONS}
                            placeholder="Select transport"
                            value={value.rtspTransport}
                            onChange={(val) => handleChange('rtspTransport', val)}
                            disabled={readOnly}
                        >
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                        <Dropdown.Root
                            label="RTSP Flags"
                            fullWidth
                            options={RTSP_FLAGS_OPTIONS}
                            placeholder="Select flags"
                            value={value.rtspFlags}
                            onChange={(val) => handleChange('rtspFlags', val)}
                            disabled={readOnly}
                        >
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                    </Page.DpRow>
                    <Page.Space />
                    <Page.DpRow style={{ gap: '20px' }}>
                        <Input
                            label="Buffer Size (bytes)"
                            type="number"
                            fullWidth
                            value={value.bufferSize.toString()}
                            onChange={(e) => handleChange('bufferSize', parseInt(e.target.value) || 0)}
                            disabled={readOnly}
                        />
                        <Input
                            label="Max Delay (μs)"
                            type="number"
                            fullWidth
                            value={value.maxDelay.toString()}
                            onChange={(e) => handleChange('maxDelay', parseInt(e.target.value) || 0)}
                            disabled={readOnly}
                        />
                    </Page.DpRow>
                    <Page.Space />
                    <Page.DpRow style={{ gap: '20px' }}>
                        <Input
                            label="Probe Size (bytes)"
                            type="number"
                            fullWidth
                            value={value.probesize.toString()}
                            onChange={(e) => handleChange('probesize', parseInt(e.target.value) || 0)}
                            disabled={readOnly}
                        />
                        <Input
                            label="Analyze Duration (μs)"
                            type="number"
                            fullWidth
                            value={value.analyzeduration.toString()}
                            onChange={(e) => handleChange('analyzeduration', parseInt(e.target.value) || 0)}
                            disabled={readOnly}
                        />
                    </Page.DpRow>

                    <Page.Space pHeight="20px" />
                    <Page.Divi spacing="0" />
                    <Page.Space pHeight="20px" />

                    {/* Output & DASH Settings */}
                    <Page.ContentDesc>
                        <TextHighlight variant="primary">Output & DASH Settings</TextHighlight>
                    </Page.ContentDesc>
                    <Page.Space />
                    <Page.DpRow style={{ gap: '20px' }}>
                        <Input
                            label="Segment Duration (sec)"
                            type="number"
                            fullWidth
                            value={value.segDuration.toString()}
                            onChange={(e) => handleChange('segDuration', parseFloat(e.target.value) || 0)}
                            disabled={readOnly}
                        />
                        <Dropdown.Root
                            label="Use Template"
                            fullWidth
                            options={[
                                { label: 'Enable', value: 'true' },
                                { label: 'Disable', value: 'false' },
                            ]}
                            placeholder="Select"
                            value={value.useTemplate.toString()}
                            onChange={(val) => handleChange('useTemplate', val === 'true')}
                            disabled={readOnly}
                        >
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                        <Dropdown.Root
                            label="Use Timeline"
                            fullWidth
                            options={[
                                { label: 'Enable', value: 'true' },
                                { label: 'Disable', value: 'false' },
                            ]}
                            placeholder="Select"
                            value={value.useTimeline.toString()}
                            onChange={(val) => handleChange('useTimeline', val === 'true')}
                            disabled={readOnly}
                        >
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                    </Page.DpRow>

                    <Page.Space pHeight="20px" />
                    <Page.Divi spacing="0" />
                    <Page.Space pHeight="20px" />

                    {/* Encoding Settings */}
                    {/* <Page.ContentDesc>
                        <TextHighlight variant="primary">Encoding Settings</TextHighlight>
                    </Page.ContentDesc>
                    <Page.Space />
                    <Page.DpRow style={{ gap: '20px' }}>
                        <Dropdown.Root
                            label="Log Level"
                            fullWidth
                            options={LOG_LEVEL_OPTIONS}
                            placeholder="Select log level"
                            value={value.logLevel}
                            onChange={(val) => handleChange('logLevel', val)}
                            disabled={readOnly}
                        >
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                    </Page.DpRow>
                    <Page.Space />
                    <Dropdown.Root
                        label="Video Codec"
                        fullWidth
                        options={VIDEO_CODEC_OPTIONS}
                        placeholder="Select video codec"
                        value={value.videoCodec}
                        onChange={(val) => handleChange('videoCodec', val)}
                        disabled={readOnly}
                    >
                        <Dropdown.Trigger />
                        <Dropdown.Menu>
                            <Dropdown.List />
                        </Dropdown.Menu>
                    </Dropdown.Root>
                    <Page.Space />
                    <Dropdown.Root
                        label="Hardware Acceleration"
                        fullWidth
                        options={HW_ACCEL_OPTIONS}
                        placeholder="Select hardware acceleration"
                        value={value.hwAccel}
                        onChange={(val) => handleChange('hwAccel', val)}
                        disabled={readOnly}
                    >
                        <Dropdown.Trigger />
                        <Dropdown.Menu>
                            <Dropdown.List />
                        </Dropdown.Menu>
                    </Dropdown.Root>
                    <Page.Space pHeight="20px" /> */}

                    {/* Generated FFmpeg params preview */}
                    <Page.ContentDesc>Generated parameters</Page.ContentDesc>
                    <Page.Space />
                    <Page.DpRow style={{ border: 'solid 0.5px #454545', borderRadius: '4px', flexDirection: 'row', margin: 0, flexWrap: 'wrap' }}>
                        <Page.DpRow style={{ padding: '4px 8px', margin: 0 }}>
                            <Badge variant="primary" size="lg">
                                <TextHighlight variant="primary">-rtsp_transport {value.rtspTransport}</TextHighlight>
                            </Badge>
                        </Page.DpRow>
                        <Page.DpRow style={{ padding: '4px 8px', margin: 0 }}>
                            <Badge variant="primary" size="lg">
                                <TextHighlight variant="primary">-rtsp_flags {value.rtspFlags}</TextHighlight>
                            </Badge>
                        </Page.DpRow>
                        <Page.DpRow style={{ padding: '4px 8px', margin: 0 }}>
                            <Badge variant="primary" size="lg">
                                <TextHighlight variant="primary">-buffer_size {value.bufferSize}</TextHighlight>
                            </Badge>
                        </Page.DpRow>
                        <Page.DpRow style={{ padding: '4px 8px', margin: 0 }}>
                            <Badge variant="primary" size="lg">
                                <TextHighlight variant="primary">-max_delay {value.maxDelay}</TextHighlight>
                            </Badge>
                        </Page.DpRow>
                        <Page.DpRow style={{ padding: '4px 8px', margin: 0 }}>
                            <Badge variant="primary" size="lg">
                                <TextHighlight variant="primary">-probesize {value.probesize}</TextHighlight>
                            </Badge>
                        </Page.DpRow>
                        <Page.DpRow style={{ padding: '4px 8px', margin: 0 }}>
                            <Badge variant="primary" size="lg">
                                <TextHighlight variant="primary">-analyzeduration {value.analyzeduration}</TextHighlight>
                            </Badge>
                        </Page.DpRow>
                        <Page.DpRow style={{ padding: '4px 8px', margin: 0 }}>
                            <Badge variant="primary" size="lg">
                                <TextHighlight variant="primary">-seg_duration {value.segDuration}</TextHighlight>
                            </Badge>
                        </Page.DpRow>
                        <Page.DpRow style={{ padding: '4px 8px', margin: 0 }}>
                            <Badge variant="primary" size="lg">
                                <TextHighlight variant="primary">-use_template {value.useTemplate ? 1 : 0}</TextHighlight>
                            </Badge>
                        </Page.DpRow>
                        <Page.DpRow style={{ padding: '4px 8px', margin: 0 }}>
                            <Badge variant="primary" size="lg">
                                <TextHighlight variant="primary">-use_timeline {value.useTimeline ? 1 : 0}</TextHighlight>
                            </Badge>
                        </Page.DpRow>
                    </Page.DpRow>
                </Page.ContentBlock>
            </Page.ContentBlock>
        </Page.ContentBlock>
    );
};
