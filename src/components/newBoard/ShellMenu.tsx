const ShellMenu = ({ pInfo, pChangeTabOption, pSetIcon }: any) => {
    return (
        <div className="home_btn_box">
            <div className="content" onClick={(aEvent: any) => pChangeTabOption(aEvent, pInfo)}>
                <div className="home_btn">{pSetIcon(pInfo)}</div>
                <p>{pInfo.label}</p>
            </div>
        </div>
    );
};
export default ShellMenu;
