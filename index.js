class React {
  #states = [];
  #statesIndex = 0;
  #root = null;
  #virtualDOM = null;
  #virtualDOMBlueprint = null;

  #cloneDeep(object) {
    if (object === null) {
      return object;
    }

    const toBeReturned = {};

    Object.keys(object).forEach(key => {
      if (typeof object[key] === "object") {
        toBeReturned[key] = this.#cloneDeep(object[key]);
        return;
      }

      toBeReturned[key] = object[key];
    });

    return toBeReturned;
  }

  #getNode({ node, props, children, key }) {
    if (typeof node === "function") {
      return node({ ...props, children, key });
    }

    return node;
  }

  #setProps(node, props) {
    Object.keys(props || {}).forEach(prop => {
      if (prop == "style") {
        Object.keys(props[prop] || {}).forEach(
          style => (node.style[style] = props[prop][style])
        );
      } else {
        node[prop] = props[prop];
      }
    });
  }

  #toDOMNode(reactElement) {
    if (["string", "number"].includes(typeof reactElement)) {
      return document.createTextNode(reactElement);
    }

    if (typeof reactElement === "object") {
      if (reactElement === null) {
        return reactElement;
      }

      if (!reactElement.node) {
        throw new Error("");
      }

      if (typeof reactElement.node === "function") {
        return reactElement.node({
          ...reactElement.props,
          children: reactElement.children,
        }).node;
      }

      return reactElement.node;
    }

    throw new Error("");
  }

  #blueprintToReactElement(blueprint) {
    if (typeof blueprint.node === "function") {
      const reactElement = blueprint.node({
        ...blueprint.props,
        children: blueprint.children,
      });

      reactElement.key = blueprint.key;

      Object.keys(reactElement).forEach(
        key => (blueprint[key] = reactElement[key])
      );
    }

    if (!blueprint.children) {
      return;
    }

    if (Array.isArray(blueprint.children)) {
      blueprint.children.forEach(child => this.#blueprintToReactElement(child));
      return;
    }

    this.#blueprintToReactElement(blueprint.children || {});
  }

  #insertChild(parentNode, children, index) {
    if (Array.isArray(children)) {
      children.forEach(child => this.#insertChild(parentNode, child, index));
      return;
    }

    const node = this.#toDOMNode(children);

    if (node) {
      if (!index) {
        index = parentNode;

        parentNode.append(node);
        return;
      }

      if (index === 0) {
        parentNode.prepend(node);
        return;
      }

      parentNode.insertBefore(node, parentNode.childNodes[index + 1]);
      return;
    }
  }

  #updateDOM(curr, next) {
    if (curr.node.nodeName !== next.node.nodeName) {
      curr.node.remove();
      curr.node.parentElement.innerHTML = "";

      if (typeof next.node === "function") {
        curr.node.parentElement.appendChild(
          next.node({ ...next.props, children: next.children })
        );
      } else {
        curr.node.parentElement.appendChild(next.node);
      }
    }

    if (curr.props !== null && next.props === null) {
      curr.props.forEach(prop => (curr.props[prop] = null));

      this.#setProps(curr.node.props);
    } else {
      this.#setProps(curr.node, next.props);
    }

    if (typeof curr.children !== typeof curr.children) {
      curr.node.parentElement.innerHTML = "";
      this.#insertChild(curr.node.parentElement, curr.children);
    } else if (["string", "number"].includes(typeof curr.children)) {
      if (curr.node.textContent !== next.node.textContent) {
        curr.node.textContent = curr.children;
      }
    } else if (Array.isArray(curr.children)) {
      if (JSON.stringify(curr.children) !== JSON.stringify(next.children)) {
        if (curr.children.length > next.children.length) {
          const toBeRemoved = [];

          curr.children.forEach(child => {
            if (!next.children.some(ch => child.key === ch.key)) {
              toBeRemoved.push(child);
            }
          });

          curr.children = next.children;

          this.#getNode(curr).childNodes.forEach(child => {
            if (!toBeRemoved.some(ch => child.isEqualNode(this.#getNode(ch)))) {
              child.remove();
            }
          });
        }

        if (curr.children.length < next.children.length) {
          const toBeAdded = [];

          next.children.forEach((child, index) => {
            if (!curr.children.some(ch => ch.key === child.key)) {
              toBeAdded.push({ child, index });
            }
          });

          curr.children = next.children;

          toBeAdded.forEach(({ child, index }) => {
            const currentDOMElement = this.#getNode(curr);

            this.#insertChild(
              currentDOMElement,
              child,
              index > currentDOMElement.children.length - 1 ? undefined : index
            );
          });
        }

        for (const index in curr.children) {
          this.#updateDOM(curr.children[index], next.children[index]);
        }
      }
    } else if (typeof curr.children === "object") {
      Object.keys(curr.children || {}).forEach(key => {
        curr.children[key] = next.children[key];
      });
      this.#updateDOM(curr.children, next.children);
    } else {
      throw new Error("");
    }
  }

  createElement(type, props = null, children = null) {
    const key = (props || { key: null }).key;

    if (typeof props !== "object" || Array.isArray(props)) {
      throw new Error("The props of a React element must be an object");
    }

    if (props !== null) {
      delete props.key;
    }

    if (typeof type === "function") {
      return {
        props,
        children,
        node: type,
        key,
      };
    }

    const createdElement = document.createElement(type);

    this.#setProps(createdElement, props);
    this.#insertChild(createdElement, children);

    return {
      node: createdElement,
      props,
      children,
      key,
    };
  }

  createRoot(node) {
    this.#root = node;

    const render = reactNode => {
      this.#virtualDOMBlueprint = reactNode;

      this.#virtualDOM = this.#cloneDeep(reactNode);

      this.#blueprintToReactElement(this.#virtualDOM);

      this.#root.appendChild(this.#virtualDOM.node);
    };

    const unmount = () => {
      this.#root.innerHTML = "";
      this.#virtualDOM = null;
      this.#virtualDOMBlueprint = null;
    };

    return {
      render,
      unmount,
    };
  }

  useState(initialState) {
    const currentStateIndex = this.#statesIndex;
    this.#statesIndex++;

    if (!this.#states[currentStateIndex]) {
      this.#states.push(initialState);
    }

    const setState = newState => {
      this.#states[currentStateIndex] = newState;
      this.#statesIndex = 0;

      const virtualDOMCurr = this.#cloneDeep(this.#virtualDOMBlueprint);

      this.#blueprintToReactElement(virtualDOMCurr);

      this.#updateDOM(this.#virtualDOM, virtualDOMCurr);
    };

    return [this.#states[currentStateIndex], setState];
  }
}

export default new React();
