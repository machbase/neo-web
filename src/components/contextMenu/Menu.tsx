import '@/components/contextMenu/Menu.scss';

interface ChildProps {
    children: React.ReactNode;
}
interface MenuProps extends ChildProps {
    isOpen: boolean;
}
interface ItemProps extends ChildProps {
    onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export const Menu = ({ children, isOpen }: MenuProps) => {
    return (
        <div className="menu-wrapper scrollbar-dark" style={{ display: isOpen ? 'flex' : 'none' }}>
            {children}
        </div>
    );
};

const Item = ({ children, onClick }: ItemProps) => {
    return (
        <div className="item" onClick={onClick}>
            {children}
        </div>
    );
};

Menu.Item = Item;

export default Menu;
