import '@/components/contextMenu/Menu.scss';

interface ChildProps {
    children: React.ReactNode;
}
interface MenuProps extends ChildProps {
    isOpen: boolean;
    zIndex?: number;
}
interface ItemProps extends ChildProps {
    onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export const Menu = ({ children, isOpen, zIndex }: MenuProps) => {
    const style = {
        display: isOpen ? 'flex' : 'none',
        ...(zIndex !== undefined && { zIndex: zIndex })
    };
    return (
        <div className="menu-wrapper" style={style}>
            { children }
        </div>
    )
}

const Item = ({ children, onClick }: ItemProps) => {
    return (
        <div className="item" onClick={onClick}>
            { children }
        </div>
    )
}

Menu.Item = Item;

export default Menu;