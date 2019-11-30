import { setCurrentComponent } from './hooks';

export default function functionalComponentInstance(FuncComponent) {
	return {
		hooks: [],
		__render(props) {
			setCurrentComponent(this);
			const nodes = FuncComponent(props);

			this.__nodes = nodes;
			return nodes;
		},
	};
}
