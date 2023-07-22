import React from "./index.js";

function Item({ text, onDelete }) {
  return React.createElement(
    "li",
    null,
    React.createElement("div", null, [
      React.createElement("span", null, text),
      React.createElement("button", { onclick: onDelete }, "delete"),
    ])
  );
}

function App() {
  const [items, setItems] = React.useState(["item1", "item2"]);
  const [input, setInput] = React.useState("");

  return React.createElement("div", null, [
    React.createElement("input", {
      value: input,
      oninput: e => setInput(e.target.value),
    }),
    React.createElement(
      "button",
      {
        onclick: () => {
          setItems([...items, input]);
        },
      },
      "Add item"
    ),
    React.createElement(
      "ul",
      null,
      items.map((item, index) =>
        React.createElement(
          Item,
          {
            text: item,
            key: index,
            onDelete: () => setItems(items.filter(i => i !== item)),
          },
          null
        )
      )
    ),
  ]);
}

const root = React.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
