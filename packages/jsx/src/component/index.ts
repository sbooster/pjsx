export abstract class Component<T extends JSX.Props = {}> implements JSX.ClassComponent<T> {
    public readonly props: T;

    protected constructor(props: T) {
        this.props = props
    }

    public abstract render(): JSX.Element;
}