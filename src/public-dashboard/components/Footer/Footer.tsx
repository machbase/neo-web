import './Footer.scss';
import favicon from '../../assets/neow_favicon.webp';

const Footer = () => {
    return (
        <div className="dashboard-footer">
            <div className="footer-content">
                <div className="footer-left">
                    <a className="footer-left-link" href="https://neo.machbase.com" target="_blank" rel="noopener noreferrer">
                        <span className="footer-icon">
                            <img src={favicon} alt="Machbase Neo" />
                        </span>
                        <span className="footer-text">
                            All-in-One Time-Series DBMS - Machbase Neo
                        </span>
                    </a>
                </div>
                <div className="footer-right">
                    <a className="footer-right-link" href="https://www.machbase.com/en" target="_blank" rel="noopener noreferrer">
                        Powered by Machbase
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Footer;
