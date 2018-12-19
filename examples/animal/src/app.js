import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardMedia from '@material-ui/core/CardMedia';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import { withResources, resourceTypes } from 'with-resources';
import * as R from 'ramda';

const styles = {
  card: {
    position: 'relative',
    margin: '50px auto 0',
    maxWidth: 400,
  },
  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  media: {
    height: 300,
  },
  actions: {
    justifyContent: 'center',
  },
};

const MediaCard = ({ data, actionCreators, classes }) => (
  <Card className={classes.card}>
    <CardActionArea>
      <CardMedia
        className={classes.media}
        image={R.pathOr(' ', [resourceTypes.ANIMALS, 'retrieveOne', 'image'], data)}
      />
      {R.path([resourceTypes.ANIMALS, 'retrieveOne', 'status', 'loading'], data) && (
        <CircularProgress className={classes.loading} />
      )}
    </CardActionArea>
    <CardActions className={classes.actions}>
      <Button
        size="small"
        color="primary"
        onClick={() => actionCreators[resourceTypes.ANIMALS].ajax({
          cargo: {
            method: 'retrieveOne',
            input: {
              params: {
                queries: [{ name: 'kind', value: 'fox' }],
              },
            },
          },
        })
        }
      >
        Gimme a fox
      </Button>
      <Button
        size="small"
        color="primary"
        onClick={() => actionCreators[resourceTypes.ANIMALS].ajax({
          cargo: {
            method: 'retrieveOne',
            input: {
              params: {
                queries: [{ name: 'kind', value: 'cat' }],
              },
            },
          },
        })
        }
      >
        Gimme a cat
      </Button>
      <Button
        size="small"
        color="primary"
        onClick={() => actionCreators[resourceTypes.ANIMALS].ajax({
          cargo: {
            method: 'retrieveOne',
            input: {
              params: {
                queries: [{ name: 'kind', value: 'dog' }],
              },
            },
          },
        })
        }
      >
        Gimme a dog
      </Button>
    </CardActions>
  </Card>
);

MediaCard.propTypes = {
  data: PropTypes.object.isRequired,
  actionCreators: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired,
};

export default withResources([
  {
    resourceType: resourceTypes.ANIMALS,
    method: 'retrieveOne',
    input: {
      params: {
        queries: [{ name: 'kind', value: 'fox' }],
      },
    },
    options: { autorun: true },
  },
])(withStyles(styles)(MediaCard));
