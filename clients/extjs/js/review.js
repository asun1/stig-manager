/*
$Id: review.js 894 2018-08-15 19:34:58Z csmig $
*/



function addReview(leaf, selectedRule, selectedResource) {
  // 'selectedRule' is optional
	/* Example of 'leaf': 
		leaf = {
			icon: "/icons/mycomputer1.png"
			id: "1-stigId179-C27WEBNWPT02-leaf"
			leaf: "true"
			qtip: "C27WEBNWPT02"
			report: "review"
			revId: "IE8-1-10"
			assetId: "86"
			assetName: "C27WEBNWPT02"
			stigId: "IE8"
			stigName: "APACHE_SERVER_2.2_WINDOWS"
			text: "C27WEBNWPT02"
		}
	*/

  // Classic compatability. Remove after modernization
  if (leaf.stigRevStr) {
    let match = leaf.stigRevStr.match(/V(\d+)R(\d+)/)
    leaf.revId = `${leaf.stigId}-${match[1]}-${match[2]}`
  }
  var idAppend = '-' + leaf.assetId + '-' + leaf.stigId.replace(".", "_");
  var TEMPLATE_STR = '!_TEMPLATE';
  var unsavedChangesPrompt = 'You have modified your review. Would you like to save your changes?';

  /******************************************************/
  // START Group Grid
  /******************************************************/
  var groupFields = Ext.data.Record.create([
    {
      name: 'assetId',
      type: 'integer'
    }, {
      name: 'groupId',
      type: 'string',
      sortType: sortGroupId
    }, {
      name: 'ruleId',
      type: 'string',
      sortType: sortRuleId
    }, {
      name: 'groupTitle',
      type: 'string'
    }, {
      name: 'ruleTitle',
      type: 'string'
    }, {
      name: 'severity',
      type: 'string'
    }, {
      name: 'result',
      type: 'string'
    }, {
      name: 'status',
      type: 'string'
    }, {
      name: 'hasAttach',
      type: 'boolean'
    }, {
      name: 'autoResult',
      type: 'boolean'
    }, {
      name: 'reviewComplete',
      type: 'boolean'
    }, {
      name: 'autoCheckAvailable',
      type: 'string'
    }
  ]);


  var groupStore = new Ext.data.JsonStore({
    proxy: new Ext.data.HttpProxy({
      url: `${STIGMAN.Env.apiBase}/assets/${leaf.assetId}/checklists/${leaf.stigId}/latest`,
      // url: `pl/getCurrentGroups.pl`,
      method: 'GET'
    }),
    root: '',
    storeId: 'groupStore' + idAppend,
    fields: groupFields,
    idProperty: 'ruleId',
    sortInfo: {
      field: 'ruleId',
      direction: 'ASC' // or 'DESC' (case sensitive for local sorting)
    },
    listeners: {
      load: function (store, records) {
        var ourGrid = Ext.getCmp('groupGrid' + idAppend);
        // Filter the store
        filterGroupStore();

        // XCCDF option in export menu
        // if (store.reader.jsonData.xmlDisabled) {
        // Ext.getCmp('groupFileMenu-export-xccdfItem' + idAppend).disable();
        // } else {
        // Ext.getCmp('groupFileMenu-export-xccdfItem' + idAppend).enable();
        // }

        // Were we passed a specific rule to select?
        if ('undefined' !== typeof selectedRule) {
          var index = ourGrid.getStore().find('ruleId', selectedRule);
          ourGrid.getSelectionModel().selectRow(index);

          var rowEl = ourGrid.getView().getRow(index);
          //rowEl.scrollIntoView(ourGrid.getGridEl(), false);
          rowEl.scrollIntoView();
          //ourGrid.getView().focusRow(index+5);
        } else {
          ourGrid.getSelectionModel().selectFirstRow();
        }

        Ext.getCmp('groupGrid-totalText' + idAppend).setText(getStatsString(store));
      },
      clear: function () {
        Ext.getCmp('groupGrid-totalText' + idAppend).setText('0 rules');
      },
      update: function (store) {
        Ext.getCmp('groupGrid-totalText' + idAppend).setText(getStatsString(store));
      },
      datachanged: function (store) {
        Ext.getCmp('groupGrid-totalText' + idAppend).setText(getStatsString(store));
      },
      exception: function (misc) {
        var ourView = groupGrid.getView();
        var response = misc.events.exception.listeners[1].fn.arguments[4];
        if (response.status != 0) {
          ourView.emptyText = 'Load failed: ' + response.responseText;
        } else {
          ourView.emptyText = 'HTTP Server Error: ' + response.statusText;
        }
        ourView.refresh();
      }
    }
  });

  /******************************************************/
  // Group grid menus
  /******************************************************/
  var groupChecklistMenu = new Ext.menu.Menu({
    id: 'groupChecklistMenu' + idAppend,
    items: [
      {
        text: 'Group/Rule display',
        hideOnClick: false,
        menu: {
          items: [
            {
              id: 'groupFileMenu-title-groupItem' + idAppend,
              text: 'Group ID and title',
              checked: false,
              group: 'titleType' + idAppend,
              handler: function (item, eventObject) {
                var cm = groupGrid.getColumnModel();
                var groupTitleIndex = cm.findColumnIndex('groupTitle');
                var ruleTitleIndex = cm.findColumnIndex('ruleTitle');
                var groupIdIndex = cm.findColumnIndex('groupId');
                var ruleIdIndex = cm.findColumnIndex('ruleId');
                var titleWidth = cm.getColumnWidth(ruleTitleIndex);
                var idWidth = cm.getColumnWidth(ruleIdIndex);
                cm.setColumnWidth(groupTitleIndex, titleWidth);
                cm.setColumnWidth(groupIdIndex, idWidth);
                groupGrid.titleColumnDataIndex = 'groupTitle';
                filterGroupStore();
                cm.setHidden(ruleTitleIndex, true);
                cm.setHidden(ruleIdIndex, true);
                cm.setHidden(groupTitleIndex, false);
                cm.setHidden(groupIdIndex, false);
                groupGrid.autoExpandColumn = 'groupTitle' + idAppend;
              }
            }, {
              id: 'groupFileMenu-title-ruleItem' + idAppend,
              text: 'Rule ID and title',
              checked: true,
              group: 'titleType' + idAppend,
              handler: function (item, eventObject) {
                var cm = groupGrid.getColumnModel();
                var groupTitleIndex = cm.findColumnIndex('groupTitle');
                var ruleTitleIndex = cm.findColumnIndex('ruleTitle');
                var groupIdIndex = cm.findColumnIndex('groupId');
                var ruleIdIndex = cm.findColumnIndex('ruleId');
                var titleWidth = cm.getColumnWidth(groupTitleIndex);
                var idWidth = cm.getColumnWidth(groupIdIndex);
                cm.setColumnWidth(ruleTitleIndex, titleWidth);
                cm.setColumnWidth(ruleIdIndex, idWidth);
                groupGrid.titleColumnDataIndex = 'ruleTitle';
                filterGroupStore();
                cm.setHidden(groupTitleIndex, true);
                cm.setHidden(groupIdIndex, true);
                cm.setHidden(ruleTitleIndex, false);
                cm.setHidden(ruleIdIndex, false);
                groupGrid.autoExpandColumn = 'ruleTitle' + idAppend;
              }
            }
          ]
        }
      }, '-'
      , {
        text: 'Export Results',
        iconCls: 'sm-export-icon',
        hideOnClick: false,
        menu: {
          items: [
            {
              text: 'XLS',
              iconCls: 'sm-export-icon',
              handler: function (item, eventObject) {
                var lo = groupStore.lastOptions;
                window.location = 'pl/getCurrentExcel.pl' + '?revId=' + lo.params.revId + '&assetId=' + lo.params.assetId;
              }
            },
            // {
            // id: 'groupFileMenu-export-xccdfItem' + idAppend,
            // text: 'XCCDF',
            // iconCls: 'sm-export-icon',
            // handler: function(item,eventObject){
            // var lo = groupStore.lastOptions;
            // window.location='pl/getCurrentXccdf.pl' + '?revId=' + lo.params.revId + '&assetId=' + lo.params.assetId;
            // }
            // },
            {
              text: 'CKL',
              iconCls: 'sm-export-icon',
              tooltip: 'Download this checklist in DISA STIG Viewer format',
              handler: async function (item, eventObject) {
                try {
                  document.body.style.cursor = 'wait'
                  let ckl = await item.getCkl(leaf)
                  item.downloadBlob(ckl.blob, ckl.filename)               
                  document.body.style.cursor = 'default'
                }
                catch (e) {
                  alert(e.message)
                }
              },
              getCkl: function (leaf) {
                return new Promise ( (resolve, reject) => {
                  var xhr = new XMLHttpRequest()
                  var url = `${STIGMAN.Env.apiBase}/assets/${leaf.assetId}/checklists/${groupGrid.sm_benchmarkId}/${groupGrid.sm_revisionStr}?format=ckl`
                  xhr.open('GET', url)
                  xhr.responseType = 'blob'
                  xhr.setRequestHeader('Authorization', 'Bearer ' + window.keycloak.token)
                  xhr.onload = function () {
                      if (this.status >= 200 && this.status < 300) {
                          var contentDispo = this.getResponseHeader('Content-Disposition')
                          //https://stackoverflow.com/questions/23054475/javascript-regex-for-extracting-filename-from-content-disposition-header/39800436
                          var fileName = contentDispo.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/)[1]           
                          resolve({
                              blob: xhr.response,
                              filename: fileName
                          })
                      } else {
                          reject({
                              status: this.status,
                              statusText: xhr.statusText
                            })
                      }
                  }
                  xhr.onerror = function () {
                      reject({
                          status: this.status,
                          message: xhr.statusText
                        })
                  }
                  xhr.send()        
                })
              },
              downloadBlob: function (blob, filename) {
                let a = document.createElement('a')
                a.style.display= "none"
                let url =  window.URL.createObjectURL(blob)
                a.href = url
                a.download = filename
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url)               
              }
            }
          ]
        }
      }, {
        text: 'Import Results...',
        iconCls: 'sm-import-icon',
        handler: function () {
          uploadResults();
          //initProgress();
        }
      }, '-',
      {
        text: 'Submit All...',
        iconCls: 'sm-ready-icon',
        hideOnClick: true,
        handler: function () {
          bulkSubmit();
        }
        // menu: {
        // items:[
        // {
        // text: 'Submit All',
        // tooltip: 'Submit all completed checks.',
        // iconCls: 'sm-ready-icon',

        // handler: function() {
        // bulkSubmit('all');            
        // }	
        // },{
        // text: 'Submit Some',
        // tooltip: 'Submit currently visible completed checks.',
        // iconCls: 'sm-ready-icon',
        // handler: function() {
        // bulkSubmit();            
        // }
        // }
        // ]

        // }
      }, {
        text: 'Reset reviews...',
        id: 'unlockMenuItem' + idAppend,
        iconCls: 'sm-unlock-icon',
        handler: function () {
          //====================================================
          //UNLOCK ALL REVIEWS FOR STIG ASSOCIATED TO ASSET
          //====================================================
          unlockStigReviewsForAsset();
        }
      }, '-'
    ],
    listeners: {
      added: function (menu, ownerCt, index) {
        var test = 1;
      },
      render: function () {
        if (curUser.accessLevel !== 3) {
          Ext.getCmp('unlockMenuItem' + idAppend).hide();
        } else {
          Ext.getCmp('unlockMenuItem' + idAppend).show();
        }
      }
    }
  });

  var groupFilterMenu = new Ext.menu.Menu({
    id: 'groupFilterMenu' + idAppend,
    items: [
      {
        text: 'All checks',

        checked: true,
        group: 'checkType' + idAppend,
        handler: function (item, eventObject) {
          groupGrid.filterType = 'All',
            Ext.getCmp('groupGrid-tb-filterButton' + idAppend).setText('All checks');
          filterGroupStore();

        }
      }, '-', {
        text: 'Manual',
        checked: false,
        group: 'checkType' + idAppend,
        handler: function (item, eventObject) {
          groupGrid.filterType = 'Manual',
            Ext.getCmp('groupGrid-tb-filterButton' + idAppend).setText('Manual only');
          filterGroupStore();
        }
      }, {
        text: 'SCAP',
        checked: false,
        group: 'checkType' + idAppend,
        handler: function (item, eventObject) {
          groupGrid.filterType = 'SCAP',
            Ext.getCmp('groupGrid-tb-filterButton' + idAppend).setText('SCAP only');
          filterGroupStore();
        }
      }, '-', {
        text: 'Incomplete',
        checked: false,
        group: 'checkType' + idAppend,
        handler: function (item, eventObject) {
          groupGrid.filterType = 'Incomplete',
            Ext.getCmp('groupGrid-tb-filterButton' + idAppend).setText('Incomplete only');
          filterGroupStore();
        }
      }
      , {
        text: 'Unsubmitted',
        checked: false,
        group: 'checkType' + idAppend,
        handler: function (item, eventObject) {
          groupGrid.filterType = 'Unsubmitted',
            Ext.getCmp('groupGrid-tb-filterButton' + idAppend).setText('Unsubmitted only');
          filterGroupStore();
        }
      }
      , {
        text: 'Submitted',
        checked: false,
        group: 'checkType' + idAppend,
        handler: function (item, eventObject) {
          groupGrid.filterType = 'Submitted',
            Ext.getCmp('groupGrid-tb-filterButton' + idAppend).setText('Submitted only');
          filterGroupStore();
        }
      }
      , {
        text: 'Returned',
        checked: false,
        group: 'checkType' + idAppend,
        handler: function (item, eventObject) {
          groupGrid.filterType = 'Returned',
            Ext.getCmp('groupGrid-tb-filterButton' + idAppend).setText('Returned only');
          filterGroupStore();
        }
      }
      , {
        text: 'Approved',
        checked: false,
        group: 'checkType' + idAppend,
        handler: function (item, eventObject) {
          groupGrid.filterType = 'Approved',
            Ext.getCmp('groupGrid-tb-filterButton' + idAppend).setText('Approved only');
          filterGroupStore();
        }
      }

    ]
  });


  /******************************************************/
  // Group grid statistics string
  /******************************************************/
  var getStatsString = function (store) {
    var totalChecks = store.getCount();
    var checksO = 0;
    var checksNF = 0;
    var checksNA = 0;
    var checksNR = 0;
    store.data.each(function (item, index, totalItems) {
      switch (item.data.result) {
        case 'fail':
          checksO++;
          break;
        case 'pass':
          checksNF++;
          break;
        case 'notapplicable':
          checksNA++;
          break;
        case '':
          checksNR++;
          break;
      }
    });
    return totalChecks + ' checks (' + checksO + ' Open, ' + checksNF + ' NF, ' + checksNA + ' NA, ' + checksNR + ' NR)';
  };

  /******************************************************/
  // The group grid
  /******************************************************/
  var groupGrid = new Ext.grid.GridPanel({
    region: 'west',
    id: 'groupGrid' + idAppend,
    sm_benchmarkId: leaf.stigId,
    sm_revisionStr: leaf.stigRevStr,
    width: '35%',
    minWidth: 340,
    hideMode: 'offsets',
    filterType: 'All', // STIG Manager defined property
    titleColumnDataIndex: 'ruleTitle', // STIG Manager defined property
    title: 'Checklist',
    split: true,
    store: groupStore,
    stripeRows: true,
    listeners: {
      beforehide: {
        fn: function (grid) {
          var test = '1';
        }
      },
      beforeshow: {
        fn: function (grid) {
          var test = '1';
        }
      }
    },
    sm: new Ext.grid.RowSelectionModel({
      singleSelect: true,
      listeners: {
        beforerowselect: function (sm, index, keepExisting, record) {
          // var resultCombo = Ext.getCmp('result-combo' + idAppend);
          // var resultComment = Ext.getCmp('result-comment' + idAppend);
          // var actionCombo = Ext.getCmp('action-combo' + idAppend);
          // var actionComment = Ext.getCmp('action-comment' + idAppend);

          // //var isDirty = (resultCombo.lastSavedData != resultCombo.value) || (resultComment.lastSavedData != resultComment.getValue()) || (actionCombo.lastSavedData != actionCombo.value) || (actionComment.lastSavedData != actionComment.getValue());
          var reviewForm = Ext.getCmp('reviewForm' + idAppend);

          if (reviewForm.groupGridRecord != record) { // perhaps the row select is the result of a view refresh
            var isDirty = Ext.getCmp('reviewForm' + idAppend).reviewChanged();
            var isValid = Ext.getCmp('reviewForm' + idAppend).getForm().isValid();

            if (isDirty && isValid && reviewForm.isLoaded) {
              Ext.Msg.show({
                title: 'Save Changes?',
                msg: unsavedChangesPrompt,
                buttons: Ext.Msg.YESNOCANCEL,
                fn: function (buttonId, text, opt) {
                  switch (buttonId) {
                    case 'yes':
                      saveReview({
                        source: "selectGroup",
                        sm: sm,
                        index: index,
                        type: 'save'
                      });
                      reviewForm.isLoaded = false;
                      break;
                    case 'no':
                      Ext.getCmp('result-combo' + idAppend).changed = false;
                      Ext.getCmp('action-combo' + idAppend).changed = false;
                      reviewForm.isLoaded = false;

                      sm.selectRow(index);
                      break;
                    case 'cancel':
                      break;
                  }

                }
              });
              return false;
            } else {
              return true;
            }
          }
          return true;
        },
        rowselect: {
          fn: function (sm, index, record) {
            handleGroupSelectionForAsset(record, leaf.assetId, idAppend, groupGrid.sm_benchmarkId, groupGrid.sm_revisionStr); // defined in stigmanUtil.js
          }
        }
      }
    }),
    view: new Ext.grid.GridView({
      forceFit: false,
      emptyText: 'No checks to display',
      // These listeners keep the grid in the same scroll position after the store is reloaded
      holdPosition: true, // HACK to be used with override
      listeners: {
      },
      deferEmptyText: false,
      getRowClass: function (record, index) {
        var checkType = record.get('checkType');
        if (checkType === true) {
          return 'sm-scap-grid-item';
        } else {
          return 'sm-manual-grid-item';
        }
      }
    }),
    columns: [
      {
        id: 'result' + idAppend,
        header: '&#160;', // per docs
        menuDisabled: true,
        width: 25,
        dataIndex: 'result',
        sortable: true,
        renderer: renderResult
      },
      {
        id: 'groupId' + idAppend,
        header: "Group",
        width: 95,
        dataIndex: 'groupId',
        sortable: true,
        hidden: true,
        align: 'left'
      },
      {
        id: 'ruleId' + idAppend,
        header: "Rule Id",
        width: 100,
        dataIndex: 'ruleId',
        hidden: false,
        sortable: true,
        align: 'left'
      },
      {
        id: 'groupTitle' + idAppend,
        header: "Group Title",
        width: 80,
        hidden: true,
        dataIndex: 'groupTitle',
        renderer: columnWrap,
        sortable: true
      },
      {
        id: 'ruleTitle' + idAppend,
        header: "Rule Title",
        width: 80,
        hidden: false,
        dataIndex: 'ruleTitle',
        renderer: columnWrap,
        sortable: true
      },
      {
        id: 'severity' + idAppend,
        header: "CAT",
        width: 32,
        align: 'center',
        dataIndex: 'severity',
        sortable: true,
        renderer: renderSeverity
      },
      {
        id: 'status' + idAppend,
        header: "Status",
        width: 50,
        align: 'center',
        dataIndex: 'status',
        sortable: true,
        renderer: renderStatuses
      }

    ],
    autoExpandColumn: 'ruleTitle' + idAppend,
    loadMask: true,
    tbar: new Ext.Toolbar({
      items: [
        {
          xtype: 'tbbutton',
          iconCls: 'sm-checklist-icon',  // <-- icon
          text: 'Checklist',
          menu: groupChecklistMenu
        }, '-', {
          xtype: 'tbbutton',
          id: 'groupGrid-tb-filterButton' + idAppend,
          iconCls: 'sm-filter-icon',  // <-- icon
          text: 'All checks',
          menu: groupFilterMenu
        }
        , {
          xtype: 'trigger',
          fieldLabel: 'Filter',
          triggerClass: 'x-form-clear-trigger',
          onTriggerClick: function () {
            this.triggerBlur();
            this.blur();
            this.setValue('');
            filterGroupStore();
          },
          id: 'groupGrid-filterTitle' + idAppend,
          width: 140,
          submitValue: false,
          disabled: false,
          enableKeyEvents: true,
          emptyText: 'Title filter...',
          listeners: {
            keyup: function (field, e) {
              filterGroupStore();
              return false;
            }
          }
        }
      ]
    }),
    bbar: new Ext.Toolbar({
      items: [
        {
          xtype: 'tbbutton',
          iconCls: 'icon-refresh',
          tooltip: 'Reload this grid',
          width: 20,
          handler: function (btn) {
            groupGrid.getStore().reload();
            //hostGrid.getStore().removeAll();
          }
        }, {
          xtype: 'tbseparator'
        }, {
          xtype: 'tbtext',
          id: 'groupGrid-totalText' + idAppend,
          text: '0 rules',
          width: 80
        }]
    })
  });

  var handleRevisionMenu = function (item, eventObject) {
    let store = Ext.getCmp('groupGrid' + idAppend).getStore()
    store.proxy.setUrl(`${STIGMAN.Env.apiBase}/assets/${leaf.assetId}/checklists/${leaf.stigId}/${item.revisionStr}`, true)
    store.load();
    loadRevisionMenu(leaf.stigId, item.revisionStr, idAppend)
    groupGrid.sm_revisionStr = item.revisionStr
  };

  async function loadRevisionMenu(benchmarkId, activeRevisionStr, idAppend) {
    try {
      let result = await Ext.Ajax.requestPromise({
        url: `${STIGMAN.Env.apiBase}/stigs/${benchmarkId}/revisions`,
        method: 'GET'
      })
      let revisions = JSON.parse(result.response.responseText)
      let revisionObject = getRevisionObj(revisions, activeRevisionStr, idAppend)
      if (Ext.getCmp('revision-menuItem' + idAppend) === undefined) {
        Ext.getCmp('groupChecklistMenu' + idAppend).addItem(revisionObject.menu);
      }
      groupGrid.setTitle(revisionObject.activeRevisionLabel);
    }
    catch (e) {
      alert(e.message)
    }
  }

  let getRevisionObj = function (revisions, activeRevisionStr, idAppend) {
    let returnObject = {}
    var menu = {
      id: 'revision-menuItem' + idAppend,
      text: 'Revisions',
      hideOnClick: false,
      menu: {
        items: []
      }
    };
    for (var i = 0; i < revisions.length; i++) {
      let r = revisions[i]
      let benchmarkDateJs = new Date(r.benchmarkDate)
      let item = {
        id: `revision-submenu${r.benchmarkId}-${r.version}-${r.release}${idAppend}`,
        text: `Version ${r.version} Release ${r.release} (${benchmarkDateJs.format('j M Y')})`,
        // revId: `${r.benchmarkId}-${r.version}-${r.release}`,
        revisionStr: r.revisionStr,
        group: 'revision-submenu-group' + idAppend,
        handler: handleRevisionMenu
      }
      if (item.revisionStr == activeRevisionStr) {
        item.checked = true;
        returnObject.activeRevisionLabel = item.text;
      } else {
        item.checked = false;
      }
      menu.menu.items.push(item);
    }
    returnObject.menu = menu;
    return returnObject;
  };

  function filterGroupStore() {
    var filterArray = [];
    // Filter menu
    switch (groupGrid.filterType) {
      case 'Manual':
      case 'SCAP':
        filterArray.push({
          property: 'autoCheckAvailable',
          value: groupGrid.filterType === 'SCAP' ? true : false
        });
        break;
      case 'Incomplete':
        filterArray.push({
          fn: function (record) {
            return record.get('reviewComplete')
          }
        });
        break;
      case 'Unsubmitted':
        filterArray.push({
          fn: function (record) {
            return (record.get('reviewComplete') && record.get('status') === 'saved');
          }
        });
        break;
      case 'Submitted':
        filterArray.push({
          fn: function (record) {
            return record.get('status') === 'submitted';
          }
        });
        break;
      case 'Rejected':
        filterArray.push({
          fn: function (record) {
            return record.get('status') === 'rejected';
          }
        });
        break;
      case 'Accepted':
        filterArray.push({
          fn: function (record) {
            return record.get('status') === 'accepted';
          }
        });
        break;
    }
    // Title textfield
    var titleValue = Ext.getCmp('groupGrid-filterTitle' + idAppend).getValue();
    if (titleValue.length > 0) {
      filterArray.push({
        property: groupGrid.titleColumnDataIndex,
        value: titleValue,
        anyMatch: true,
        caseSensitive: false
      });
    }

    groupStore.filter(filterArray);

  }


  /******************************************************/
  // END Group Grid
  /******************************************************/

  let contentTpl = new Ext.XTemplate(
    '<div class=cs-home-header-top>{ruleId}</div>',
    '<div class=cs-home-header-sub>{title} (Category {severity})</div>',
    '<div class=cs-home-body-title>Manual Check',
    '<div class=cs-home-body-text>',
    '<tpl for="checks">',
    '<pre>{[values.content.trim()]}</pre>',
    '</tpl>',
    '</div>',
    '</div>',
    '<div class=cs-home-body-title>Fix',
    '<div class=cs-home-body-text>',
    '<tpl for="fixes">',
    '<pre>{[values.text.trim()]}</pre>',
    '</tpl>',
    '</div>',
    '</div>',
    '<div class=cs-home-header-sub></div>',
    '<div class=cs-home-body-title>Other Data',
    '<div class=cs-home-body-text><b>Vulnerability Discussion</b><br><br>',
    '<pre>{[values.vulnDiscussion.trim()]}</pre>',
    '</div>',
    '<div class=cs-home-body-text><b>Documentable: </b>{documentable}</div>',
    '<div class=cs-home-body-text><b>Responsibility: </b>{responsibility}</div>',
    '<div class=cs-home-body-text><b>Controls: </b><br>',
    '<table class=cs-home-body-table border="1">',
    '<tr><td><b>CCI</b></td><td><b>AP Acronym</b></td><td><b>Control</b></td></tr>',
    '<tpl for="ccis">',
    '<tr><td>{cci}</td><td>{apAcronym}</td><td>{control}</td></tr>',
    '</tpl>',
    '</table>',
    '</div>',
    '</div>')

  /******************************************************/
  // START Resources panel
  /******************************************************/

  /******************************************************/
  // START Other Grid
  /******************************************************/

  var otherFields = Ext.data.Record.create([
    {
      name: 'assetName',
      type: 'string'
    }, {
      name: 'dept',
      type: 'string'
    }, {
      name: 'result',
      type: 'string'
    },  {
      name: 'action',
      type: 'string'
    }, {
      name: 'autoResult',
      type: 'boolean'
    }, {
      name: 'action',
      type: 'string'
    }, {
      name: 'username',
      type: 'string'
    }, {
      name: 'resultComment',
      type: 'string'
    }, {
      name: 'actionComment',
      type: 'string'
    }, {
      name: 'reviewId',
      type: 'int'
    }

  ]);

  var otherStore = new Ext.data.JsonStore({
    root: '',
    id: 'otherStore' + idAppend,
    fields: otherFields,
    sortInfo: {
      field: 'assetName',
      direction: 'ASC' // or 'DESC' (case sensitive for local sorting)
    },
    listeners: {
      exception: function (misc) {
        var ourView = otherGrid.getView();
        var response = misc.events.exception.listeners[1].fn.arguments[4];
        if (response.status != 0) {
          var maskStr = 'Load failed: ' + response.responseText;
          //ourView.emptyText = 'Load failed: ' + response.responseText;
        } else {
          //ourView.emptyText = 'HTTP Server Error: ' + response.statusText;
          var maskStr = 'HTTP Server Error: ' + response.statusText;
        }
        //ourView.refresh();
        otherGrid.getEl().mask(maskStr);
      }
    },
    idProperty: 'reviewId'
  });

  // var otherStore = new Ext.data.ArrayStore({
  // id: 'otherStore' + idAppend,
  // fields: otherFields,
  // idProperty: 'reviewId'
  // });

  var expander = new Ext.ux.grid.RowExpander({
    tpl: new Ext.XTemplate(
      '<p><b>Reviewer:</b> {username}</p>',
      '<p><b>Result Comment:</b> {resultComment}</p>',
      '<tpl if="actionComment">',
      '<p><b>Action Comment:</b> {actionComment}</p>',
      '</tpl>'
    )
  });

  var otherGrid = new Ext.grid.GridPanel({
    //region: 'center',
    enableDragDrop: true,
    ddGroup: 'gridDDGroup',
    plugins: expander,
    layout: 'fit',
    height: 350,
    border: false,
    id: 'otherGrid' + idAppend,
    //title: 'Other Assets',
    store: otherStore,
    stripeRows: true,
    sm: new Ext.grid.RowSelectionModel({
      singleSelect: true
    }),
    view: new Ext.grid.GridView({
      forceFit: true,
      emptyText: 'No other assets to display.',
      deferEmptyText: false
    }),
    tbar: new Ext.Toolbar({
      items: []
    }),
    columns: [
      expander,
      {
        id: 'target' + idAppend,
        header: "Asset",
        width: 100,
        dataIndex: 'assetName',
        sortable: true,
        align: 'left',
        renderer: function (value, metaData, record, rowIndex, colIndex, store) {
          var iconPath;
          if (record.data.assetGroup == TEMPLATE_STR) {
            metaData.css += ' sm-cell-template';
          } else {
            metaData.css += ' sm-cell-asset';
          }
          return value;
        }
      },
      {
        id: 'state' + idAppend,
        header: "Result",
        width: 80,
        dataIndex: 'result',
        sortable: true,
        renderer: function (value, metaData, record, rowIndex, colIndex, store) {
          switch (value) {
            case 'notchecked':
              return "In Progress"
              break
            case 'notapplicable':
              return "Not Applicable"
              break
            case 'pass':
              return "Not a Finding"
              break
            case 'fail':
              return "Open"
              break
          }
        }
      },
      {
        id: 'action' + idAppend,
        header: "Action",
        width: 80,
        dataIndex: 'action',
        sortable: true,
        renderer: function (value, metaData, record, rowIndex, colIndex, store) {
          switch (value) {
            case 'remediate':
              return "Remediate"
              break
            case 'mitigate':
              return "Mitigate"
              break
            case 'exception':
              return "Exception"
              break
          }
        }
      }
    ],
    // width: 300,
    loadMask: true,
    autoExpandColumn: 'target' + idAppend,
    emptyText: 'No other assets to display',
    listeners: {
      render: function () {
        var one = 1;
      }
    }
  });

  /******************************************************/
  // END Other Grid
  /******************************************************/

  /******************************************************/
  // START Attachments Panel
  /******************************************************/

  var attachFields = Ext.data.Record.create([
    {
      name: 'raId',
      type: 'int'
    }, {
      name: 'artId',
      type: 'int'
    }, {
      name: 'filename',
      type: 'string'
    }, {
      name: 'userName',
      type: 'string'
    }, {
      name: 'description',
      type: 'string'
    }, {
      name: 'ts',
      type: 'date',
      dateFormat: 'Y-m-d H:i:s'
    }
  ]);

  var attachStore = new Ext.data.JsonStore({
    root: 'rows',
    storeId: 'attachStore' + idAppend,
    fields: attachFields,
    sortInfo: {
      field: 'filename',
      direction: 'ASC' // or 'DESC' (case sensitive for local sorting)
    },
    idProperty: 'raId'
  });

  var attachGrid = new Ext.grid.GridPanel({
    //region: 'center',
    disableSelection: true,
    layout: 'fit',
    cls: 'custom-artifacts',
    hideHeaders: true,
    border: false,
    id: 'attachGrid' + idAppend,
    store: attachStore,
    stripeRows: true,
    // sm: new Ext.grid.RowSelectionModel ({
    // singleSelect: true
    // }),
    view: new Ext.grid.GridView({
      forceFit: true,
      emptyText: 'No attachments to display.',
      deferEmptyText: false
    }),
    tbar: new Ext.Toolbar({
      items: [
        {
          xtype: 'tbbutton',
          text: 'Attach artifact...',
          id: 'attachGrid-add-button' + idAppend,
          icon: 'img/attach-16.png',
          handler: function (btn) {
            attachArtifact();
          }
        }
      ]
    }),
    columns: [
      {
        id: 'attach-filename' + idAppend,
        header: "Artifact",
        width: 100,
        dataIndex: 'filename',
        sortable: true,
        align: 'left',
        renderer: function (value, metadata, record) {
          //var returnStr = '<img src="' + getFileIcon(value) + '" width=12px height=12px>&nbsp;';
          var returnStr = '<img src="' + getFileIcon(value) + '" class="sm-artifact-file-icon">';
          returnStr += '<b>' + value + '</b>';
          returnStr += '<br><br><b>Attached by:</b> ' + record.data.userName;
          returnStr += '<br><b>Description:</b> ' + record.data.description;
          returnStr += '<br><br>';
          return returnStr;
        }
      }
      , {
        width: 25,
        header: 'download', // not shown, used in cellclick handler
        fixed: true,
        dataIndex: 'none',
        renderer: function (value, metadata, record) {
          metadata.css = 'artifact-download';
          metadata.attr = 'ext:qtip="Download artifact"';
          return '';
        }
      }
      , {
        width: 25,
        header: 'delete',
        fixed: true,
        dataIndex: 'none',
        renderer: function (value, metadata, record) {
          if (attachGrid.groupGridRecord.data.statusId == 0 || attachGrid.groupGridRecord.data.statusId == 2) {
            metadata.css = 'artifact-delete';
            metadata.attr = 'ext:qtip="Unattach the artifact from this review"';
          }
          return '';
        }
      }
    ],
    loadMask: true,
    autoExpandColumn: 'attach-filename' + idAppend,
    emptyText: 'No attachments to display',
    listeners: {
      cellclick: function (grid, rowIndex, columnIndex, e) {
        //if (grid.getSelectionModel().isSelected(rowIndex)) {
        var r = grid.getStore().getAt(rowIndex);
        var header = grid.getColumnModel().getColumnHeader(columnIndex);
        switch (header) {
          case 'download':
            window.location = 'pl/getArtifact.pl?artId=' + r.data.artId;
            break;
          case 'delete':
            removeMap(r);
            break;
        }
        //}
      }
    }
  });


  function removeMap(r) {
    var confirmStr = 'Do you want to unattach the artifact "' + r.data.filename + '"?';
    Ext.Msg.confirm("Confirm", confirmStr, function (btn, text) {
      if (btn == 'yes') {
        Ext.Ajax.request({
          url: 'pl/removeArtifactMap.pl',
          params: {
            raId: r.data.raId
          },
          success: function (response, request) {
            var responseObj = Ext.util.JSON.decode(response.responseText);
            if (responseObj.success) {
              attachStore.remove(r);
              if (attachStore.getCount() > 0) {
                reviewForm.groupGridRecord.set('hasAttach', 1);
              } else {
                reviewForm.groupGridRecord.set('hasAttach', 0);
              }
            }
          },
          failure: function (results, request) {
            // if (p.maskEl != undefined) {
            // p.maskEl.unmask();
            // }
            // alert('Error: review could not be updated.');
          }
        });
      }
    });

  };

  function attachArtifact() {
    var reviewForm = Ext.getCmp('reviewForm' + idAppend);
    var assetId = reviewForm.groupGridRecord.data.assetId;
    var ruleId = reviewForm.groupGridRecord.data.ruleId;

    var deptArtifactFields = Ext.data.Record.create([
      {
        name: 'artId',
        type: 'int'
      }, {
        name: 'filename',
        type: 'string'
      }, {
        name: 'userName',
        type: 'string'
      }, {
        name: 'dept',
        type: 'string'
      }, {
        name: 'sha1',
        type: 'string'
      }, {
        name: 'description',
        type: 'string'
      }, {
        name: 'ts',
        type: 'date',
        dateFormat: 'Y-m-d H:i:s'
      }
    ]);

    var deptArtifactStore = new Ext.data.JsonStore({
      url: 'pl/getArtifacts.pl',
      autoLoad: true,
      root: 'rows',
      fields: deptArtifactFields,
      totalProperty: 'records',
      idProperty: 'artId',
      listeners: {
        load: function (store, records) {
          deptArtifactGrid.getSelectionModel().selectFirstRow();
        }
      }
    });

    var sm = new Ext.grid.RowSelectionModel({
      singleSelect: true,
      listeners: {
        rowselect: function (sm, rowIndex, r) {
          Ext.getCmp('dpt-attach-btn' + idAppend).setText('Attach "' + r.data.filename + '"');
        }
      }
    });

    var deptArtifactGrid = new Ext.grid.GridPanel({
      cls: 'artifact-grid',
      anchor: '100% -20',
      height: 200,
      store: deptArtifactStore,
      stripeRows: true,
      sm: sm,
      columns: [
        {
          header: "Artifact",
          width: 100,
          dataIndex: 'filename',
          sortable: true,
          align: 'left',
          renderer: function (value, metadata, record) {
            // var returnStr = '<img src="' + getFileIcon(value) + '" class="sm-artifact-file-icon">' + '<a href="pl/getArtifact.pl?artId=' + record.data.artId + '" style="color:#000;cursor:pointer;">' + value + '</a>';
            var returnStr = '<img src="' + getFileIcon(value) + '" class="sm-artifact-file-icon">' + value;
            return returnStr;
          }
        }
        , {
          header: "Description",
          id: 'artifact-description',
          width: 100,
          dataIndex: 'description',
          sortable: true,
          align: 'left',
        }
      ],
      autoExpandColumn: 'artifact-description',
      view: new Ext.grid.GridView({
        autoFill: true,
        deferEmptyText: false
      }),
      loadMask: false,
      listeners: {
        // cellclick: function (grid,rowIndex,columnIndex,e) {
        // window.location='http://www.google.com';
        // var r = grid.getStore().getAt(rowIndex);
        // var header = grid.getColumnModel().getColumnHeader(columnIndex);
        // switch (header) {
        // case 'download':
        // //window.location='pl/getAttachment.pl?aiId=' + r.data.aiId;
        // window.location='pl/getAttachment.pl?aiId=11';
        // break;
        // }
        // //}
        // }
      },
      setValue: function (v) {
      },
      getValue: function () {
        //return this.getSelectionModel().getSelected().data.artId
      },
      markInvalid: function () { },
      clearInvalid: function () { },
      isValid: function () { return true },
      disabled: false,
      getName: function () { return this.name },
      validate: function () { return true },
      hideLabel: true,
      isFormField: true,
      name: 'artId'
    });



    var fp = new Ext.FormPanel({
      baseCls: 'x-plain',
      monitorValid: true,
      bodyStyle: 'padding: 10px 10px 0 10px;',
      labelWidth: 60,
      items: [
        deptArtifactGrid
      ],
      buttons: [{
        text: 'Attach',
        id: 'dpt-attach-btn' + idAppend,
        icon: 'img/attach-16.png',
        tooltip: 'Attach an artifact to this review.',
        formBind: true,
        handler: function () {
          if (fp.getForm().isValid()) {
            fp.getForm().submit({
              url: 'pl/attachArtifact.pl',
              params: {
                assetId: assetId,
                ruleId: ruleId,
                artId: deptArtifactGrid.getSelectionModel().getSelected().data.artId
              },
              waitMsg: 'Attaching artifact...',
              success: function (f, o) {
                window.close();
                attachStore.loadData(o.result.artifacts, true); // append new record
                attachStore.sort('filename');
                reviewForm.groupGridRecord.set('hasAttach', 1);
              },
              failure: function (f, o) {
                window.close();
                Ext.Msg.alert('Failure', o.result.message);
              }
            });
          }
        }
      }]
    });

    var window = new Ext.Window({
      title: 'Attach artifact',
      modal: true,
      width: 600,
      height: 300,
      //minWidth: 500,
      //minHeight: 140,
      layout: 'fit',
      plain: true,
      bodyStyle: 'padding:5px;',
      buttonAlign: 'center',
      items: fp
    });

    window.show(document.body);
  };

  /******************************************************/
  // END Attachments Panel
  /******************************************************/
  /******************************************************/
  // START History Panel
  /******************************************************/

  var historyData = new Sm_HistoryData(idAppend);

  /******************************************************/
  // END History Panel
  /******************************************************/

  var resourcesPanel = new Ext.Panel({
    region: 'center',
    title: 'Review Resources',
    layout: 'fit',
    items: [{
      xtype: 'tabpanel',
      border: false,
      deferredRender: false,
      id: 'resources-tabs' + idAppend,
      activeTab: ('undefined' !== typeof selectedResource ? selectedResource : 'other-tab' + idAppend),
      listeners: {
        beforerender: function (tabs) {
        }
      },
      items: [{
        title: 'Other Assets',
        border: false,
        layout: 'fit',
        id: 'other-tab' + idAppend,
        items: otherGrid
      }, {
        title: 'Feedback',
        //layout: 'fit',
        id: 'feedback-tab' + idAppend,
        //padding: 2,
        autoScroll: true
      }, {
        title: 'Attachments',
        layout: 'fit',
        id: 'attach-tab' + idAppend,
        items: attachGrid
      }, {
        title: 'History',
        layout: 'fit',
        id: 'history-tab' + idAppend,
        items: historyData.grid
      }]
    }]
  });



  /******************************************************/
  // END Resources panel
  /******************************************************/
  /******************************************************/
  // START Input form
  /******************************************************/

  var reviewForm = new Ext.form.FormPanel({
    region: 'south',
    //disabled: true,
    split: true,
    //height: 420,
    height: '65%',
    minHeight: 320,
    id: 'reviewForm' + idAppend,
    baseCls: 'x-plain',
    border: true,
    headerCfg: {
      cls: 'x-panel-header',
      border: false
    },
    title: 'Review on ' + leaf.assetName,
    padding: 10,
    labelWidth: 50,
    isLoaded: false, // STIG Manager defined property
    groupGridRecord: {}, // STIG Manager defined property
    monitorValid: false,
    trackResetOnLoad: false,
    reviewChanged: function () { // STIG Manager defined property
      var resultCombo = Ext.getCmp('result-combo' + idAppend);
      var resultComment = Ext.getCmp('result-comment' + idAppend);
      var actionCombo = Ext.getCmp('action-combo' + idAppend);
      var actionComment = Ext.getCmp('action-comment' + idAppend);
      return (resultCombo.lastSavedData != resultCombo.value) || (resultComment.lastSavedData != resultComment.getValue()) || (actionCombo.lastSavedData != actionCombo.value) || (actionComment.lastSavedData != actionComment.getValue());
    },
    items: [{
      xtype: 'fieldset',
      anchor: '100%, 49%',
      title: 'Evaluation',
      items: [{
        xtype: 'combo',
        cls: 'sm-review-result-input',
        width: 100,
        lastSavedData: "",
        //anchor: '50%',
        id: 'result-combo' + idAppend,
        changed: false,
        fieldLabel: 'Result',
        emptyText: 'Your result...',
        valueNotFoundText: 'Your result...',
        //allowBlank: false,
        disabled: true,
        name: 'result',
        hiddenName: 'result',
        mode: 'local',
        editable: false,
        store: new Ext.data.SimpleStore({
          fields: ['result', 'resultStr'],
          data: [['pass', 'Not a Finding'], ['notapplicable', 'Not Applicable'], ['fail', 'Open']]
        }),
        valueField: 'result',
        displayField: 'resultStr',
        listeners: {
          'select': function (combo, record, index) {
            if (record.data.result == '0') { // Open
              Ext.getCmp('action-combo' + idAppend).enable();
              Ext.getCmp('action-comment' + idAppend).enable();
            } else {
              Ext.getCmp('action-combo' + idAppend).disable();
              Ext.getCmp('action-comment' + idAppend).disable();
            }
          },
          'change': function (combo, newVal, oldVal) {
            combo.changed = true;
          }
        },
        triggerAction: 'all'
      }, {
        xtype: 'textarea',
        cls: 'sm-review-result-textarea',
        disabled: true,
        anchor: '100% -30',
        lastSavedData: "",
        allowBlank: true,
        id: 'result-comment' + idAppend,
        //emptyText: 'Please address the specific items in the review.',
        //height: 65,
        fieldLabel: 'Comment',
        autoScroll: 'auto',
        name: 'resultComment'
      }] // end fieldset items
    }, {
      xtype: 'fieldset',
      id: 'recommendation-fs' + idAppend,
      anchor: '100%, 49%',
      title: 'Recommendation',
      items: [{
        xtype: 'combo',
        lastSavedData: "",
        disabled: true,
        changed: false,
        allowBlank: true,
        //anchor: '100%',
        width: 100,
        id: 'action-combo' + idAppend,
        fieldLabel: 'Action',
        emptyText: 'Your action...',
        valueNotFoundText: 'Your action...',
        name: 'action',
        hiddenName: 'action',
        mode: 'local',
        editable: false,
        store: new Ext.data.SimpleStore({
          fields: ['action', 'actionStr'],
          data: [['remediate', 'Remediate'], ['mitigate', 'Mitigate'], ['exception', 'Exception']]
        }),
        displayField: 'actionStr',
        valueField: 'action',
        listeners: {
          'select': function (combo, record, index) {
            if (record.data.actionId == 3) {
              Ext.getCmp('rd-checkbox' + idAppend).setValue(1);
            }
          },
          'change': function (combo, newVal, oldVal) {
            combo.changed = true;
          }
        },
        triggerAction: 'all'
      }, {
        xtype: 'textarea',
        cls: 'sm-review-action-textarea',
        lastSavedData: "",
        disabled: true,
        allowBlank: true,
        anchor: '100% -30',
        id: 'action-comment' + idAppend,
        //emptyText: 'Please describe how the action will be accomplished.',
        //height: 65,
        fieldLabel: 'Comment',
        autoScroll: 'auto',
        name: 'actionComment'
      }] // end fieldset items
    }, {
      xtype: 'displayfield',
      anchor: '100% 2%',
      id: 'editor' + idAppend,
      fieldLabel: 'Modified',
      allowBlank: true,
      name: 'editStr',
      readOnly: true
    }
      , {
      xtype: 'hidden',
      name: 'autoResult',
      id: 'autoResult' + idAppend
    }, {
      xtype: 'hidden',
      name: 'locked',
      id: 'locked' + idAppend
    }], // end form panel items,
    buttons: [
      {
        text: 'Save without submitting',
        id: 'reviewForm-button-1' + idAppend,
        formBind: true,
        handler: function (btn) {
          saveReview({
            source: 'form',
            type: btn.actionType
          });
        }
      }, {
        text: 'Save and Submit',
        iconCls: 'sm-ready-icon',
        id: 'reviewForm-button-2' + idAppend,
        formBind: true,
        handler: function (btn) {
          saveReview({
            source: 'form',
            type: btn.actionType
          });
        }
      }], // end buttons
    listeners: {
      render: function (formPanel) {
        this.getForm().waitMsgTarget = this.getEl();
        var reviewFormPanelDropTargetEl = formPanel.body.dom;
        var reviewFormPanelDropTarget = new Ext.dd.DropTarget(reviewFormPanelDropTargetEl, {
          ddGroup: 'gridDDGroup',
          notifyEnter: function (ddSource, e, data) {
            var editableDest = (reviewForm.groupGridRecord.data.status == 'saved' || reviewForm.groupGridRecord.data.status == 'rejected');
            var copyableSrc = (data.selections[0].data.autoResult == false || (data.selections[0].data.autoResult == true && data.selections[0].data.action !== ''));
            if (editableDest && copyableSrc) { // accept drop of manual reviews or Open SCAP reviews with actions
              //Add some flare to invite drop.
              reviewForm.body.stopFx();
              reviewForm.body.highlight("ffff9c", {
                attr: "background-color", //can be any valid CSS property (attribute) that supports a color value
                endColor: "DFE8F6",
                easing: 'easeIn',
                duration: 1
              });
            } else {
              return (reviewFormPanelDropTarget.dropNotAllowed);
            }
          },
          notifyOver: function (ddSource, e, data) {
            var editableDest = (reviewForm.groupGridRecord.data.status == 'saved' || reviewForm.groupGridRecord.data.status == 'rejected');
            var copyableSrc = (data.selections[0].data.autoResult == false || (data.selections[0].data.autoResult == true && data.selections[0].data.action !== ''));
            if (editableDest && copyableSrc) { // accept drop of manual reviews or SCAP reviews with actions
              return (reviewFormPanelDropTarget.dropAllowed);
            } else {
              return (reviewFormPanelDropTarget.dropNotAllowed);
            }
          },
          notifyDrop: function (ddSource, e, data) {
            var editableDest = (reviewForm.groupGridRecord.data.status == 'saved' || reviewForm.groupGridRecord.data.status == 'rejected');
            var copyableSrc = (data.selections[0].data.autoResult == false || (data.selections[0].data.autoResult == true && data.selections[0].data.action !== ''));
            if (editableDest && copyableSrc) { // accept drop of manual reviews or SCAP reviews with actions
              // Reference the record (single selection) for readability
              //var selectedRecord = ddSource.dragData.selections[0];
              var selectedRecord = data.selections[0];
              // Load the record into the form
              var sCombo = Ext.getCmp('result-combo' + idAppend);
              var sComment = Ext.getCmp('result-comment' + idAppend);
              var aCombo = Ext.getCmp('action-combo' + idAppend);
              var aComment = Ext.getCmp('action-comment' + idAppend);
              if (!sCombo.disabled && selectedRecord.data.autoResult == false) {
                sCombo.setValue(selectedRecord.data.result);
              }
              //if (!sComment.disabled && selectedRecord.data.autoResult == 0) {
              sComment.setValue(selectedRecord.data.resultComment);
              //}
              if (sCombo.getValue() == 4) {
                aCombo.enable();
                aComment.enable();
              } else {
                aCombo.disable();
                aComment.disable();
              }
              if (!aCombo.disabled) {
                aCombo.setValue(selectedRecord.data.actionId);
              }
              if (!aComment.disabled) {
                aComment.setValue(selectedRecord.data.actionComment);
              }
            }
            return (true);

          }
        }); // end DropTarget
      }, // end render
      clientvalidation: setReviewFormItemStates
    } // end listeners
  });

  function setReviewFormItemStates(fp, valid) {
    var resultCombo = Ext.getCmp('result-combo' + idAppend);
    var resultComment = Ext.getCmp('result-comment' + idAppend);
    var actionCombo = Ext.getCmp('action-combo' + idAppend);
    var actionComment = Ext.getCmp('action-comment' + idAppend);
    var button1 = Ext.getCmp('reviewForm-button-1' + idAppend); // left button
    var button2 = Ext.getCmp('reviewForm-button-2' + idAppend); // right button
    var attachButton = Ext.getCmp('attachGrid-add-button' + idAppend); // 'add attachment' button
    var autoResultField = Ext.getCmp('autoResult' + idAppend); // hidden 'autoResult' field

    // Initial state: Enable the entry fields if the review status is 'In progress' or 'Rejected', disable them otherwise
    var editable = (fp.groupGridRecord.data.status === '' || fp.groupGridRecord.data.status === 'saved' || fp.groupGridRecord.data.status === 'rejected');
    resultCombo.setDisabled(!editable); // disable if not editable
    resultComment.setDisabled(!editable);
    actionCombo.setDisabled(!editable);
    actionComment.setDisabled(!editable);

    if (autoResultField.value == true && resultCombo.value === 'notapplicable') {
      autoResultField.value = false;
    }

    if (autoResultField.value == true) { // Disable editing for autoResult
      resultCombo.disable();
      resultComment.disable();
    }

    if (editable) {
      if (resultCombo.value === 'fail') { // Result is 'Open'
        actionCombo.enable();
        actionComment.enable();
      } else {
        actionCombo.disable();
        actionComment.disable();
      }
      if (resultCombo.value === '' || resultCombo.value === undefined || resultCombo.value === null) {
        resultComment.disable();
      }
    }

    //Disable the add attachment button if the review has not been saved yet
    if (fp.groupGridRecord.data.result == "") {
      attachButton.disable();
      attachButton.setTooltip('This button is disabled because the review has never been saved.');
    } else {
      attachButton.enable();
      //attachButton.setTooltip('Attach a file to this review.'); 
      attachButton.setTooltip('');
    }

    // Quick hide of the buttons and exit if review status is 'Approved', 
    // otherwise show the buttons and continue processing below
    if (fp.groupGridRecord.data.status == 'accepted') {
      button1.hide();
      button2.hide();
      attachButton.disable();
      attachButton.setTooltip('This button is disabled because the review is locked.');
      return;
    } else {
      button1.show();
      button2.show();
      if (fp.groupGridRecord.data.statusId == 'submitted') {
        attachButton.disable();
        attachButton.setTooltip('This button is disabled because the review is submitted');
      } else {
        attachButton.enable();
        attachButton.setTooltip('');
      }
    }


    if (isReviewComplete(resultCombo.value, resultComment.getValue(), actionCombo.value, actionComment.getValue())) {
      if (fp.reviewChanged()) {
        // review has been changed (is dirty)
        switch (fp.groupGridRecord.data.status) {
          case '':
          case 'saved':
            // button 1
            button1.enable();
            button1.setText('Save without submitting');
            button1.setIconClass('sm-database-save-icon');
            button1.actionType = 'save';
            button1.setTooltip('');
            // button 2
            button2.enable();
            button2.setText('Save and Submit');
            button2.actionType = 'save and submit';
            button2.setTooltip('');
            break;
          case 'submitted': // 'ready' (a.k.a 'submitted'), dirty review can't happen
            break;
          case 'rejected': // 'rejected'
            // button 1
            button1.enable();
            button1.setText('Save without submitting');
            button1.setIconClass('sm-database-save-icon');
            button1.actionType = 'save';
            button1.setTooltip('');
            // button 2
            button2.enable();
            button2.setText('Save and Resubmit');
            button2.actionType = 'save and submit';
            button2.setTooltip('');
            break;
          case 'accepted': // 'approved', dirty review can't happen
            break;
        }
      } else {
        // review has not been changed (is in last saved state)
        switch (fp.groupGridRecord.data.status) {
          case '':
          case 'saved': // in progress
            // button 1
            button1.disable();
            button1.setText('Save without submitting');
            button1.setIconClass('sm-database-save-icon');
            button1.actionType = '';
            button1.setTooltip('This button is disabled because the review has not been modified.');
            // button 2
            button2.enable();
            button2.setText('Submit');
            button2.actionType = 'submit';
            button2.setTooltip('');
            break;
          case 'submitted': // ready
            // button 1
            button1.enable();
            button1.setText('Unsubmit');
            button1.setIconClass('sm-ready-flip-icon');
            button1.actionType = 'unsubmit';
            button1.setTooltip('');
            // button 2
            button2.disable();
            button2.setText('Submit');
            button2.actionType = '';
            button2.setTooltip('This button is disabled because the review has already been submitted.');
            // review fields
            break;
          case 'rejected': // rejected
            // button 1
            button1.disable();
            button1.setText('Save without submitting');
            button1.setIconClass('sm-database-save-icon');
            button1.actionType = '';
            button1.setTooltip('This button is disabled because the review has not been modified.');
            // button 2
            button2.disable();
            button2.setText('Save and Resubmit');
            button2.actionType = '';
            button2.setTooltip('This button is disabled because the review has not been modified.');
            break;
          case 'accepted': // approved
            // we should never get here because of the earlier 'if' statement
            // button 1
            button1.hide();
            button1.setText('Save without submitting');
            button1.setIconClass('sm-database-save-icon');
            button1.actionType = '';
            // button 2
            button2.hide();
            button2.setText('Save and Submit');
            button2.actionType = '';
            break;
        }
      }
    } else {
      // review is incomplete
      if (fp.reviewChanged()) {
        // review has been changed
        // button 1
        button1.enable();
        button1.setText('Save without submitting');
        button1.setIconClass('sm-database-save-icon');
        button1.actionType = 'save and unsubmit';
        button1.setTooltip('');
        // button 2
        button2.disable();
        button2.setText('Save and Submit');
        button2.actionType = '';
        button2.setTooltip('This button is disabled because the review is not complete and cannot be submitted.');
      } else {
        // review has not been changed (as loaded)
        // button 1
        button1.disable();
        button1.setText('Save without submitting');
        button1.setIconClass('sm-database-save-icon');
        button1.actionType = '';
        button1.setTooltip('This button is disabled because the review has not been modified.');
        // button 2
        button2.disable();
        button2.setText('Save and Submit');
        button2.actionType = '';
        button2.setTooltip('This button is disabled because the review is not complete and cannot be submitted.');
      }
    }
  };

  /******************************************************/
  // END input form
  /******************************************************/

  var reviewItems = [
    groupGrid,
    {
      region: 'center',
      //disabled: true,
      xtype: 'panel',
      split: true,
      collapsible: false,
      padding: 20,
      autoScroll: true,
      id: 'content-panel' + idAppend,
      title: 'Rule',
      tpl: contentTpl
    }
    ,
    {
      region: 'east',
      layout: 'border',
      width: '35%',
      minWidth: 340,
      border: false,
      split: true,
      collapsible: false,
      id: 'east-panel' + idAppend,
      items: [resourcesPanel, reviewForm]
    }
  ];

  var thisTab = Ext.getCmp('reviews-center-tab').add({
    id: 'reviewTab' + idAppend,
    iconCls: 'sm-stig-icon',
    //title: '<img src=/icons/security_firewall_on.png height=12 width=12> ' + leaf.stigName + ' (' + leaf.assetName + ')',
    title: leaf.assetName + " : " + leaf.stigName,
    closable: true,
    layout: 'border',
    sm_TabType: 'asset_review',
    sm_GroupGridView: groupGrid.getView(),
    items: reviewItems,
    listeners: {
      beforeclose: function (p) {
        var resultCombo = Ext.getCmp('result-combo' + idAppend);
        var resultComment = Ext.getCmp('result-comment' + idAppend);
        var actionCombo = Ext.getCmp('action-combo' + idAppend);
        var actionComment = Ext.getCmp('action-comment' + idAppend);

        var isDirty = (resultCombo.lastSavedData != resultCombo.value) || (resultComment.lastSavedData != resultComment.getValue()) || (actionCombo.lastSavedData != actionCombo.value) || (actionComment.lastSavedData != actionComment.getValue());

        //var isDirty = Ext.getCmp('reviewForm' + idAppend).getForm().isDirty();
        var isValid = Ext.getCmp('reviewForm' + idAppend).getForm().isValid();

        if (isDirty && isValid) {
          Ext.Msg.show({
            title: 'Save Changes?',
            msg: unsavedChangesPrompt,
            buttons: Ext.Msg.YESNOCANCEL,
            fn: function (buttonId, text, opt) {
              switch (buttonId) {
                case 'yes':
                  saveReview({
                    source: 'closeTab',
                    type: 'save'
                  });
                  break;
                case 'no':
                  Ext.getCmp('result-combo' + idAppend).changed = false;
                  Ext.getCmp('action-combo' + idAppend).changed = false;
                  Ext.getCmp('reviews-center-tab').remove('reviewTab' + idAppend);
                  break;
                case 'cancel':
                  break;
              }

            }
          });
          return false;
        } else {
          return true;
        }
      }
    }
  });
  thisTab.show();

  groupGrid.getStore().load();
  loadRevisionMenu(leaf.stigId, leaf.stigRevStr, idAppend)

  async function saveReview(saveParams) {
    // saveParams = {
    // source,
    // sm,
    // index,
    // type
    // }

    let fp = Ext.getCmp('reviewForm' + idAppend)
    Ext.getBody().mask('Saving...')

    let fvalues = fp.getForm().getFieldValues(false, true) // dirtyOnly=false, getDisabled=true
    let jsonData = {}
    if (typeof fvalues.result !== 'undefined') {
      jsonData.result = fvalues.result
    }
    if (typeof fvalues.resultComment !== 'undefined') {
      jsonData.resultComment = fvalues.resultComment === "" ? null : fvalues.resultComment
    }
    if (typeof fvalues.action !== 'undefined') {
      jsonData.action = fvalues.action
    }
    if (typeof fvalues.actionComment !== 'undefined') {
      jsonData.actionComment = fvalues.actionComment === "" ? null : fvalues.actionComment
    }
    if (typeof fvalues.autoResult !== 'undefined') {
      jsonData.autoResult = fvalues.autoResult === 'true' ? true : false
    }
    try {
      let result, reviewFromApi
      switch (saveParams.type) {
        case 'submit':
        case 'unsubmit':
          result = await Ext.Ajax.requestPromise({
            url: `${STIGMAN.Env.apiBase}/reviews/${leaf.assetId}/${fp.groupGridRecord.data.ruleId}`,
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            jsonData: {
              status: saveParams.type == 'submit' ? 'submitted' : 'saved'
            }
          })
          reviewFromApi = JSON.parse(result.response.responseText)
          break
        case 'save and unsubmit':
          jsonData.status = 'saved'
          result = await Ext.Ajax.requestPromise({
            url: `${STIGMAN.Env.apiBase}/reviews/${leaf.assetId}/${fp.groupGridRecord.data.ruleId}`,
            method: 'PUT',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            jsonData: jsonData
          })
          reviewFromApi = JSON.parse(result.response.responseText)
          break
        case 'save and submit':
          jsonData.status = 'submitted'
          result = await Ext.Ajax.requestPromise({
            url: `${STIGMAN.Env.apiBase}/reviews/${leaf.assetId}/${fp.groupGridRecord.data.ruleId}`,
            method: 'PUT',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            jsonData: jsonData
          })
          reviewFromApi = JSON.parse(result.response.responseText)
          break
        case 'save':
          jsonData.status = 'saved'
          result = await Ext.Ajax.requestPromise({
            url: `${STIGMAN.Env.apiBase}/reviews/${leaf.assetId}/${fp.groupGridRecord.data.ruleId}`,
            method: 'PUT',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            jsonData: jsonData
          })
          reviewFromApi = JSON.parse(result.response.responseText)
          break
      }
      resultCombo = Ext.getCmp('result-combo'+idAppend)
      resultComment = Ext.getCmp('result-comment'+idAppend)
      actionCombo = Ext.getCmp('action-combo'+idAppend)
      actionComment = Ext.getCmp('action-comment'+idAppend)				
      resultCombo.changed = false
      actionCombo.changed = false
      fp.groupGridRecord.data.result = reviewFromApi.result
      fp.groupGridRecord.data.reviewComplete = reviewFromApi.reviewComplete
      fp.groupGridRecord.data.status = reviewFromApi.status
      fp.groupGridRecord.commit()

      let extDate = new Date(reviewFromApi.ts)
      Ext.getCmp('editor'+idAppend).setValue(`${extDate.format('Y-m-d H:i')} by ${reviewFromApi.username}`)

      filterGroupStore()

      //Reset lastSavedData to current values, so we do not trigger the save again:
      resultCombo.lastSavedData = resultCombo.value;
      resultComment.lastSavedData = resultComment.getValue()
      actionCombo.lastSavedData = actionCombo.value
      actionComment.lastSavedData = actionComment.getValue()

      //Continue the action that triggered this save (if any):					
      if (saveParams.source == "closeTab"){
        Ext.getCmp('reviews-center-tab').remove('reviewTab' + idAppend)
      
      }
      else if (saveParams.source == "selectGroup"){
        saveParams.sm.selectRow(saveParams.index);
      }
      //Ext.Msg.alert('Success','Successfully updated review.');
    }
    catch (e) {
      Ext.Msg.alert('Fail','Failed to update review.')
    }
    finally {
      Ext.getBody().unmask()
    }
  } //end saveReview();

  function uploadResults() {
    var fp = new Ext.FormPanel({
      standardSubmit: true,
      fileUpload: true,
      baseCls: 'x-plain',
      monitorValid: true,
      autoHeight: true,
      //bodyStyle: 'padding: 10px 10px 0 10px;',
      labelWidth: 1,
      hideLabel: true,
      defaults: {
        anchor: '100%',
        allowBlank: false
      },
      items: [
        {
          xtype: 'hidden',
          id: 'import-assetId',
          name: 'assetId',
          value: leaf.assetId
        },
        {
          xtype: 'hidden',
          id: 'import-benchmarkId',
          name: 'benchmarkId',
          value: leaf.stigId
        },
        {
          xtype: 'hidden',
          id: 'import-benchmarkId',
          name: 'packageId'
        },
        {
          xtype: 'hidden',
          id: 'import-source',
          name: 'source',
          value: 'review'
        },
        { // start fieldset config
          xtype: 'fieldset',
          title: 'Instructions',
          autoHeight: true,
          items: [
            {
              xtype: 'displayfield',
              id: 'infoText1',
              name: 'infoText',
              html: "Please browse for either a CKL file generated by DISA's STIG Viewer or an XCCDF file from SPAWAR's SCAP Compliance Checker (SCC).<br><br>The imported file must contain results for:<p>Asset: <b>" + leaf.assetName + '</b><p>STIG: <b>' + leaf.stigId + '</b>',
            }]
        },
        {
          xtype: 'fileuploadfield',
          id: 'form-file',
          emptyText: 'Browse for a file...',
          name: 'importFile',
          accept: '.ckl,.xml',
          buttonText: 'Browse...',
          buttonCfg: {
            icon: "img/disc_drive.png"
          },
          listeners: {
            fileselected: function (field, filename) {
              var i = field.fileInput.dom.files[0];
              var extension = i.name.substr(i.name.lastIndexOf('.') + 1).toLowerCase();
              if (extension != 'ckl' && extension != 'xml') {
                field.setValue("");
                alert("Invalid file extension");
                return;
              }
              // Ext.getCmp('import-filesize').setValue(i.size);
              // Ext.getCmp('import-filename').setValue(i.name);
              // Ext.getCmp('import-modified').setValue(Math.floor(i.lastModified / 1000));
              // Ext.getCmp('import-uuid').setValue(getUuid());
            }
          }
        },
        {
          xtype: 'displayfield',
          id: 'infoText2',
          name: 'infoText',
          html: "<i><b>IMPORTANT: Results from the imported file will overwrite any existing results!</b></i>",
        }
      ],
      buttonAlign: 'center',
      buttons: [{
        text: 'Import',
        icon: 'img/page_white_get.png',
        tooltip: 'Import STIG results',
        formBind: true,
        handler: async function () {
          try {
            if (fp.getForm().isValid()) {
              let formEl = fp.getForm().getEl().dom
              let formData = new FormData(formEl)
              appwindow.close();
              initProgress("Importing file", "Initializing...", 'groupStore' + idAppend);

              let response = await fetch(`${STIGMAN.Env.apiBase}/reviews`, {
                method: 'POST',
                headers: new Headers({
                  'Authorization': `Bearer ${window.keycloak.token}`
                }),
                body: formData
              })
              let json = await response.json()
							updateStatusText (JSON.stringify(json, null, 2))

              // const reader = response.body.getReader()
              // const td = new TextDecoder("utf-8")
              // let isreviewComplete = false
              // do {
              //   const {value, reviewComplete} = await reader.read()
              //   updateStatusText (td.decode(value),true)
              //   isreviewComplete = reviewComplete
              // } while (!isreviewComplete)
            }
          }
          catch (e) {
            alert (e.message)
          }
        }
      },
      {
        text: 'Cancel',
        handler: function () { appwindow.close(); }
      }
      ]
    });

    var appwindow = new Ext.Window({
      title: 'Import STIG results from CKL or XCCDF',
      modal: true,
      width: 500,
      //height:140,
      //minWidth: 500,
      //minHeight: 140,
      layout: 'fit',
      plain: true,
      bodyStyle: 'padding:5px;',
      buttonAlign: 'center',
      items: fp
    });

    appwindow.show(document.body);


  }; //end uploadResults();



  function unlockStigReviewsForAsset() {
    //===================================================
    //RESETS ALL RULE REVIEWS FOR A SPECIFIC STIG
    //AND SPECIFIC ASSET.
    //===================================================
    var unlockObject = new Object;
    unlockObject.stigId = leaf.stigId;
    unlockObject.stigName = leaf.stigName;
    unlockObject.assetId = leaf.assetId;
    unlockObject.assetName = leaf.assetName;
    unlockObject.packageId = -1;
    unlockObject.packageName = -1;
    unlockObject.gridTorefresh = groupGrid;
    unlockObject.unlockDepth = "STIG-ASSET";
    getUnlockPrompt("STIG-ASSET", unlockObject, groupGrid);
  };



  function bulkSubmit(all) {
    // groupStore;
    var ourStore = groupStore;
    var ruleArray = encodeStoreDone(ourStore, 'ruleId')

    // var total = ourStore.getCount();
    // var ruleArray = [];
    // var i = 0;
    // var record1 = ourStore.getAt(0);
    // var data1 = ourStore.getAt(0).data;		
    // var rule1 = ourStore.getAt(0).data.ruleId;
    // // ruleArray.push(rule1);
    // while (i < total){
    // // if (isReviewComplete(resultCombo.value,resultComment.getValue(),actionCombo.value,actionComment.getValue())) { 
    // ruleArray.push(ourStore.getAt(i).data.ruleId);
    // // }
    // i++;
    // }



    var fp = new Ext.FormPanel({
      fileUpload: true,
      baseCls: 'x-plain',
      monitorValid: true,
      autoHeight: true,
      //bodyStyle: 'padding: 10px 10px 0 10px;',
      labelWidth: 1,
      hideLabel: true,
      defaults: {
        anchor: '100%',
        allowBlank: false
        //msgTarget: 'side'
      },
      baseParams: {
        assetId: leaf.assetId,
        assetName: leaf.assetName,
        revId: leaf.revId,
        stigName: leaf.stigName,
        stigId: leaf.stigId,
        ruleArray: encodeStoreDone(ourStore, 'ruleId')
      },
      items: [
        {
          xtype: 'radiogroup',
          // fieldLabel: 'Choose your favorite',
          columns: 1,
          itemId: 'someOrAllChecks',
          items: [
            {
              xtype: 'radio',
              boxLabel: 'Submit all checks for this STIG and Asset.',
              name: 'checks',
              checked: true,
              inputValue: 'all'
            },
            {
              xtype: 'radio',
              boxLabel: 'Submit only displayed checks.',
              name: 'checks',
              inputValue: 'some'
            }
          ]
        },
        {
          xtype: 'displayfield',
          id: 'infoText2',
          // emptyText: 'Browse for a file... asset:' + leaf.assetId,
          // fieldLabel: 'Import',
          name: 'infoText',
          html: "<i><b>NOTE: </b> Only completed checks will be submitted.</i>",
          // buttonText: 'Browse...',
          // buttonCfg: {
          // icon: "img/disc_drive.png"
          // }
        }
        // ,{ // start fieldset config
        // xtype:'fieldset',
        // title: 'Confirmation',
        // autoHeight:true,
        // items: [
        // {
        // xtype: 'displayfield',
        // id: 'infoText1',
        // // emptyText: 'Browse for a file... asset:' + leaf.assetId,
        // // fieldLabel: 'Import',
        // name: 'infoText',
        // html: "Submit all completed checks?",
        // // buttonText: 'Browse...',
        // // buttonCfg: {
        // // icon: "img/disc_drive.png"
        // // }
        // }]
        // }
      ]
      //}]
      ,
      buttonAlign: 'center',
      buttons: [{
        text: 'Submit',
        icon: 'img/ready-16.png',
        tooltip: 'Import STIG results',
        formBind: true,
        handler: function () {
          if (fp.getForm().isValid()) {
            fp.getForm().submit({
              url: 'pl/submitChecks.pl',
              waitMsg: 'Submitting Checks...',
              success: function (f, o) {
                window.close();
                Ext.Msg.alert(o.result.status, o.result.message);
                groupGrid.getStore().reload();
              },
              failure: function (f, o) {
                window.close();
                Ext.Msg.alert(o.result.status, o.result.message);
                f.reset();
              }
            });
          }
        }
      },
      {
        text: 'Cancel',
        handler: function () { window.close(); }
      }
      ]
    });

    var window = new Ext.Window({
      title: 'Submit multiple reveiws.',
      modal: true,
      width: 350,
      //height:140,
      //minWidth: 500,
      //minHeight: 140,
      layout: 'form',
      plain: true,
      bodyStyle: 'padding:5px;',
      buttonAlign: 'center',
      items: fp
    });

    window.show(document.body);

  }; //end bulkSubmit2;

}; //end addReview();
