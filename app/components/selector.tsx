import styles from "../styles/selector.module.scss";

interface SelectorItem {
  title: string;
  value: string;
}

interface SelectorProps {
  items: SelectorItem[];
  onClose: () => void;
  onSelection: (selection: string[]) => void;
}

export function Selector(props: SelectorProps) {
  const { items, onClose, onSelection } = props;

  return (
    <div className={styles.selector}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.menu}>
        {items.map((item) => (
          <div
            key={item.value}
            className={styles.item}
            onClick={() => {
              onSelection([item.value]);
              onClose();
            }}
          >
            {item.title}
          </div>
        ))}
      </div>
    </div>
  );
}
