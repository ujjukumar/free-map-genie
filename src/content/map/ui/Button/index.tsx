export interface ButtonProps extends React.PropsWithChildren {
    onClick?: React.MouseEventHandler;
    disabled?: boolean;
}

export default function Button(props: ButtonProps) {
    return (
        <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={props.onClick}
            disabled={props.disabled}
        >
            {props.children}
        </button>
    );
}
