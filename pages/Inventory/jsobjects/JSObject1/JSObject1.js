export default {
  openCreatePO: async () => {
    await storeValue('poMode', 'CREATE');
    await storeValue('poLines', []);
    await getNextPO.run();
    showModal(drawerCreatePO.name);
  }
}