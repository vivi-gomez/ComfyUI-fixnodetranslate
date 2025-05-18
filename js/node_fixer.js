import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

function addMenuHandler(nodeType, cb) {
	const getOpts = nodeType.prototype.getExtraMenuOptions;
	nodeType.prototype.getExtraMenuOptions = function () {
		const r = getOpts.apply(this, arguments);
		cb.apply(this, arguments);
		return r;
	};
}

function copyInputValues(src) {
	const inputValues = {};
	if (!src.widgets) return inputValues;

	for (let widget of src.widgets) {
		if (widget && widget.name !== undefined) {
			inputValues[widget.name] = widget.value;
		}
	}
	return inputValues;
}

function applyInputValues(dest, inputValues) {
	if (!dest.widgets) return;
	for (let widget of dest.widgets) {
		if (widget && widget.name in inputValues) {
			widget.value = inputValues[widget.name];
			if (widget.callback) {
				widget.callback(widget.value);
			}
		}
	}
}

function node_info_copy(src, dest) {
	// copy input connections
	for (let i in src.inputs) {
		let input = src.inputs[i];
		if (input.link) {
			let link = app.graph.links[input.link];
			let src_node = app.graph.getNodeById(link.origin_id);
			src_node.connect(link.origin_slot, dest.id, input.name);
		}
	}

	// copy output connections
	let output_links = {};
	for (let i in src.outputs) {
		let output = src.outputs[i];
		if (output.links) {
			let links = [];
			for (let j in output.links) {
				links.push(app.graph.links[output.links[j]]);
			}
			output_links[output.name] = links;
		}
	}

	for (let i in dest.outputs) {
		let links = output_links[dest.outputs[i].name];
		if (links) {
			for (let j in links) {
				let link = links[j];
				let target_node = app.graph.getNodeById(link.target_id);
				dest.connect(parseInt(i), target_node, link.target_slot);
			}
		}
	}

	app.graph.afterChange();
}

app.registerExtension({
	name: "Comfy.Manager.NodeFixerAdvanced",

	beforeRegisterNodeDef(nodeType, nodeData, app) {
		addMenuHandler(nodeType, function (_, options) {
			options.push({
				content: "Fix node (recreate + keep inputs)",
				callback: () => {
					const inputValues = copyInputValues(this);

					let new_node = LiteGraph.createNode(nodeType.comfyClass);
					new_node.pos = [this.pos[0], this.pos[1]];
					app.canvas.graph.add(new_node, false);

					node_info_copy(this, new_node);
					applyInputValues(new_node, inputValues);

					app.canvas.graph.remove(this);
				},
			});
		});
	},

	nodeCreated(node, app) {
		// opcional para debug
	}
});
