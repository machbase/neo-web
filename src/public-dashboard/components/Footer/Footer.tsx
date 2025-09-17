import './Footer.scss';
import favicon from '../../assets/neow_favicon.webp';

const Footer = () => {
    return (
        <div className="dashboard-footer">
            <div className="footer-content">
                <span className="footer-icon">
                    <img src={favicon} alt="Machbase Neo" />
                </span>
                <span className="footer-text">
                    <a className="footer-link" href="https://neo.machbase.com" target="_blank" rel="noopener noreferrer">
                        Powered by Machbase Neo - Global No.1 Performance & All-in-One Time-Series DBMS
                    </a>
                </span>
            </div>
        </div>
    );
};

export default Footer;
