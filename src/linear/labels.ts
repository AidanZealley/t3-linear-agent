type Label = { name: string; parent?: PromiseLike<{ name: string } | undefined> };

// Linear stores grouped labels as a child name plus a parent, not "group:child".
export async function routingLabels(labels: Label[]): Promise<string[]> {
  return Promise.all(labels.map(async label => {
    if (label.name.startsWith("harness:") || label.name.startsWith("difficulty:")) return label.name;
    const parent = await label.parent;
    return parent?.name === "harness" || parent?.name === "difficulty" ? `${parent.name}:${label.name}` : label.name;
  }));
}
