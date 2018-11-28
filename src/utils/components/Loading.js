const styleFullScreenOverlay = {
  position: 'fixed',
  top: 0,
  left: 0,
  // background: 'rgba(0, 0, 0, 0.6)',
  width: '100%',
  height: '100%',
  zIndex: 999,
};
const styleCenterOnScreen = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
};

export default ({ fullScreenOverlay = true }) => (
  <div>
    {fullScreenOverlay && <div style={styleFullScreenOverlay} />}
    <div style={fullScreenOverlay ? styleCenterOnScreen : null}>
      <div className="sk-rotating-plane" />
    </div>
  </div>
);
